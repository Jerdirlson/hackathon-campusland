import { http } from './client'

export type PatchStatus = 'pending' | 'approved' | 'rejected' | 'modified' | 'applied'
export type ActionType = 'add_trip' | 'delay_trip' | 'cancel_trip' | 'assign_users' | 'increase_frequency' | 'notify_users'

export interface ProposedAction {
  type: ActionType
  [key: string]: unknown
}

export interface AiPatch {
  id: number
  trigger_id: number
  trigger_type: string
  route_id: number | null
  daily_trip_id: number | null
  analysis: string
  proposed_actions: ProposedAction[]
  status: PatchStatus
  reviewed_by: number | null
  reviewed_at: string | null
  applied_at: string | null
  created_at: string
}

export const aiPatchesApi = {
  list: (status?: string) =>
    http<AiPatch[]>(`/ai-patches${status ? `?status=${status}` : ''}`),
  get: (id: number) => http<AiPatch>(`/ai-patches/${id}`),
  review: (id: number, action: 'approve' | 'reject' | 'modify', proposed_actions?: ProposedAction[]) =>
    http<AiPatch>(`/ai-patches/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ action, ...(proposed_actions ? { proposed_actions } : {}) }),
    }),
  apply: (id: number) =>
    http<{ applied: boolean; results: unknown[] }>(`/ai-patches/${id}/apply`, { method: 'POST' }),
}
