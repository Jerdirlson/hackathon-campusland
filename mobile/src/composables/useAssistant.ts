import { ref } from 'vue'
import { api, type AssistantMessage, type RouteSuggestion } from '@/api/client'

const SESSION_KEY = 'ml.assistant.session'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  suggestion?: RouteSuggestion
}

function readStoredSession(): number | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function writeStoredSession(id: number) {
  try {
    localStorage.setItem(SESSION_KEY, String(id))
  } catch {
    // localStorage no disponible (modo privado, etc.) — lo ignoramos.
  }
}

/**
 * Estado y lógica del chat del Asistente.
 * Mantiene la conversación, el estado de carga y la sesión persistida.
 */
export function useAssistant() {
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const sessionId = ref<number | null>(readStoredSession())

  // Contador local incremental para ids estables sin depender de Date.now().
  let nextId = 1
  const makeId = () => nextId++

  function push(msg: Omit<ChatMessage, 'id'>): ChatMessage {
    const full: ChatMessage = { id: makeId(), ...msg }
    messages.value.push(full)
    return full
  }

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading.value) return

    push({ role: 'user', content: trimmed })
    loading.value = true

    try {
      const res = await api.assistantChat(trimmed, sessionId.value ?? undefined)
      sessionId.value = res.sessionId
      writeStoredSession(res.sessionId)
      push({ role: 'assistant', content: res.reply, suggestion: res.suggestion })
    } catch {
      push({
        role: 'assistant',
        content:
          'Ups, no pude procesar eso. Revisa que el asistente esté configurado e inténtalo de nuevo.',
      })
    } finally {
      loading.value = false
    }
  }

  /** Rellena el historial de la sesión guardada (solo role + content). */
  async function loadHistory() {
    if (sessionId.value == null) return
    try {
      const { messages: history } = await api.assistantHistory(sessionId.value)
      messages.value = history.map((m: AssistantMessage) => ({
        id: makeId(),
        role: m.role,
        content: m.content,
        suggestion: m.suggestion,
      }))
    } catch {
      // Sin historial recuperable — arrancamos con el estado vacío.
    }
  }

  /** Inicia una conversación desde cero: limpia mensajes y olvida la sesión. */
  function reset() {
    messages.value = []
    sessionId.value = null
    loading.value = false
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {
      // ignorar
    }
  }

  return { messages, loading, sessionId, send, loadHistory, reset }
}
