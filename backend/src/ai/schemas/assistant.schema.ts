import type OpenAI from 'openai'

export const PLAN_ROUTE_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'plan_route',
    description:
      'Calcula la mejor ruta entre dos estaciones usando el grafo real de Metrolínea. Úsala cuando ya conozcas el código de la estación de origen y de destino.',
    parameters: {
      type: 'object',
      properties: {
        from_code: {
          type: 'string',
          description: 'Código de la estación de origen, ej. P6-S01',
        },
        to_code: {
          type: 'string',
          description: 'Código de la estación de destino, ej. P2-S24',
        },
      },
      required: ['from_code', 'to_code'],
      additionalProperties: false,
    },
  },
}

export interface SuggestionLeg {
  routeCode: string | null
  fromName: string
  toName: string
  minutes: number
}

export interface RouteSuggestion {
  fromCode: string
  fromName: string
  toCode: string
  toName: string
  totalMinutes: number
  transfers: number
  legs: SuggestionLeg[]
}

export interface AssistantMessage {
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface AssistantChatRequest {
  sessionId?: number
  message: string
}

export interface AssistantChatResponse {
  sessionId: number
  reply: string
  suggestion?: RouteSuggestion
}
