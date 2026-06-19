export interface AddTripAction {
  type: 'add_trip'
  route_id: number
  bus_id: number
  departure: string
  date: string
}

export interface DelayTripAction {
  type: 'delay_trip'
  daily_trip_id: number
  new_departure: string
  reason: string
}

export interface CancelTripAction {
  type: 'cancel_trip'
  daily_trip_id: number
  reason: string
}

export interface AssignUsersAction {
  type: 'assign_users'
  daily_trip_id: number
  trip_plan_ids: number[]
}

export interface IncreaseFrequencyAction {
  type: 'increase_frequency'
  route_id: number
  time_window: string
  interval_minutes: number
}

export interface NotifyUsersAction {
  type: 'notify_users'
  daily_trip_id: number
  message: string
}

export type ProposedAction =
  | AddTripAction
  | DelayTripAction
  | CancelTripAction
  | AssignUsersAction
  | IncreaseFrequencyAction
  | NotifyUsersAction

export interface PatchResponse {
  analysis: string
  proposed_actions: ProposedAction[]
}

export interface AiTriggerRow {
  id: number
  trigger_type: string
  route_id: number | null
  daily_trip_id: number | null
  payload: any
  status: string
}
