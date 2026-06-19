import OpenAI from 'openai'
import { db } from '../../db/client'
import { AiClient } from '../AiClient'
import { findPath, RoutingResult } from '../../services/RoutingService'
import {
  PLAN_ROUTE_TOOL,
  RouteSuggestion,
  SuggestionLeg,
  AssistantChatResponse,
} from '../schemas/assistant.schema'

const DEMO_EMAIL = 'asistente-demo@metrolinea.co'
const MAX_TOOL_ITERATIONS = 3

interface ChatInput {
  sessionId?: number
  message: string
}

interface HistoryRow {
  role: 'user' | 'assistant'
  content: string
}

interface CatalogRow {
  route_code: string
  station_code: string
  station_name: string
  address: string | null
  stop_order: number
}

export class ChatService {
  static async chat(input: ChatInput): Promise<AssistantChatResponse> {
    // 1) Resolve demo user (public endpoint, idempotent)
    const userId = await ChatService.resolveDemoUser()

    // 2) Resolve or create session
    const sessionId = await ChatService.resolveSession(input.sessionId, userId)

    // 3) Load history BEFORE inserting the new message
    const { rows: historyRows } = await db.query<HistoryRow>(
      `SELECT role, content FROM assistant_messages
       WHERE session_id = $1 ORDER BY created_at`,
      [sessionId]
    )
    const history: OpenAI.Chat.ChatCompletionMessageParam[] = historyRows.map(
      row => ({ role: row.role, content: row.content })
    )

    // 4) Insert the new user message
    await db.query(
      `INSERT INTO assistant_messages (session_id, role, content)
       VALUES ($1, 'user', $2)`,
      [sessionId, input.message]
    )

    // 5) Build compact catalog for the LLM
    const catalogText = await ChatService.buildCatalog()

    // 6) System prompt (Spanish) including catalog
    const systemPrompt = ChatService.buildSystemPrompt(catalogText)

    // 7) Tool-calling loop
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: input.message },
    ]

    const client = new AiClient()
    let reply = ''
    let lastResult: RoutingResult | null = null

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const completion = await client.chatRaw(messages, [PLAN_ROUTE_TOOL])
      const choiceMessage = completion.choices[0]?.message

      if (!choiceMessage) {
        break
      }

      const toolCalls = choiceMessage.tool_calls

      if (toolCalls && toolCalls.length > 0) {
        // Append the assistant message that requested the tool calls
        messages.push(choiceMessage as OpenAI.Chat.ChatCompletionMessageParam)

        for (const toolCall of toolCalls) {
          if (toolCall.type !== 'function' || toolCall.function.name !== 'plan_route') {
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: 'unknown_tool' }),
            })
            continue
          }

          let toolContent: string
          try {
            const args = JSON.parse(toolCall.function.arguments) as {
              from_code?: string
              to_code?: string
            }
            const fromCode = args.from_code ?? ''
            const toCode = args.to_code ?? ''
            const result = await findPath(fromCode, toCode)
            if (result) {
              lastResult = result
              toolContent = JSON.stringify(result)
            } else {
              toolContent = JSON.stringify({ error: 'no_route' })
            }
          } catch {
            toolContent = JSON.stringify({ error: 'invalid_arguments' })
          }

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: toolContent,
          })
        }
        // Continue the loop so the model can use the tool results
        continue
      }

      // No tool calls: final reply
      reply = choiceMessage.content ?? ''
      break
    }

    // 8) Build suggestion from lastResult (if any)
    const suggestion = lastResult ? ChatService.buildSuggestion(lastResult) : undefined

    // 9) Insert assistant message (con la sugerencia en metadata para que persista)
    await db.query(
      `INSERT INTO assistant_messages (session_id, role, content, metadata)
       VALUES ($1, 'assistant', $2, $3)`,
      [sessionId, reply, suggestion ? JSON.stringify({ suggestion }) : null]
    )

    // 10) Return response
    return { sessionId, reply, suggestion }
  }

  private static async resolveDemoUser(): Promise<number> {
    await db.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ('Asistente Demo', $1, '-', 'passenger')
       ON CONFLICT (email) DO NOTHING`,
      [DEMO_EMAIL]
    )
    const { rows } = await db.query<{ id: number }>(
      `SELECT id FROM users WHERE email = $1`,
      [DEMO_EMAIL]
    )
    return rows[0].id
  }

  private static async resolveSession(
    sessionId: number | undefined,
    userId: number
  ): Promise<number> {
    if (sessionId !== undefined) {
      const { rows } = await db.query<{ id: number }>(
        `SELECT id FROM assistant_sessions WHERE id = $1`,
        [sessionId]
      )
      if (rows[0]) {
        return rows[0].id
      }
    }

    const { rows } = await db.query<{ id: number }>(
      `INSERT INTO assistant_sessions (user_id) VALUES ($1) RETURNING id`,
      [userId]
    )
    return rows[0].id
  }

  private static async buildCatalog(): Promise<string> {
    const { rows } = await db.query<CatalogRow>(
      `SELECT r.code AS route_code, s.code AS station_code, s.name AS station_name,
              s.address, rs.stop_order
       FROM route_stations rs
       JOIN routes r ON r.id = rs.route_id
       JOIN stations s ON s.id = rs.station_id
       WHERE r.status = 'active'
       ORDER BY r.code, rs.stop_order`
    )

    const byRoute = new Map<string, string[]>()
    for (const row of rows) {
      const list = byRoute.get(row.route_code) ?? []
      list.push(`${row.station_code} ${row.station_name}`)
      byRoute.set(row.route_code, list)
    }

    const lines: string[] = []
    for (const [routeCode, stations] of byRoute) {
      lines.push(`Ruta ${routeCode}: ${stations.join(' | ')}`)
    }
    return lines.join('\n')
  }

  private static buildSystemPrompt(catalogText: string): string {
    return `Eres el asistente de movilidad de Metrolínea, el sistema de transporte público de Bucaramanga.

Tu objetivo es ayudar a los usuarios a planear su viaje en bus de forma clara y amable.

Reglas:
- Usa SOLO estaciones que aparezcan en el catálogo de abajo, incluyendo siempre el código exacto de la estación.
- Si el usuario menciona un lugar, parada o dirección, mapéalo a la estación más parecida del catálogo por nombre o dirección.
- Si falta el origen o el destino para planear la ruta, PREGUNTA de forma breve y amable en lugar de inventar datos.
- Cuando tengas el código de la estación de origen y el de destino, llama a la función plan_route con esos códigos.
- Tras recibir el resultado de plan_route, explica en lenguaje natural y claro qué ruta(s) tomar, cuántos transbordos hacer y los minutos estimados del viaje.
- Si no existe una ruta posible, indícaselo amablemente al usuario y, si puedes, sugiere alternativas del catálogo.
- Responde SIEMPRE en español, con un tono amable y conciso.

Catálogo de rutas y estaciones activas:
${catalogText}`
  }

  private static buildSuggestion(result: RoutingResult): RouteSuggestion {
    const path = result.path
    const legs: SuggestionLeg[] = []

    let currentLeg: SuggestionLeg | null = null
    let currentRouteCode: string | null | undefined = undefined

    for (const step of path) {
      // The origin step has no incoming route; subsequent steps carry the route taken to reach them.
      if (step.type === 'origin') {
        continue
      }

      if (currentLeg === null || step.routeCode !== currentRouteCode) {
        // Start a new leg. Its starting station is the previous step in the path.
        const stepIndex = path.indexOf(step)
        const prevStep = path[stepIndex - 1]
        currentLeg = {
          routeCode: step.routeCode,
          fromName: prevStep ? prevStep.stationName : step.stationName,
          toName: step.stationName,
          minutes: step.minutesFromPrev,
        }
        currentRouteCode = step.routeCode
        legs.push(currentLeg)
      } else {
        currentLeg.toName = step.stationName
        currentLeg.minutes += step.minutesFromPrev
      }
    }

    const first = path[0]
    const last = path[path.length - 1]

    return {
      fromCode: first.stationCode,
      fromName: first.stationName,
      toCode: last.stationCode,
      toName: last.stationName,
      totalMinutes: result.totalMinutes,
      transfers: result.transfers,
      legs,
    }
  }
}
