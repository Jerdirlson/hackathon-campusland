import { PatchResponse } from './patch.schema'

export type HighDemandResponse = PatchResponse

export const highDemandJsonSchema = {
  name: 'high_demand_response',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      analysis: { type: 'string' },
      proposed_actions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['increase_frequency', 'add_trip', 'notify_users'],
            },
            route_id: { type: 'number' },
            time_window: { type: 'string' },
            interval_minutes: { type: 'number' },
            bus_id: { type: 'number' },
            departure: { type: 'string' },
            date: { type: 'string' },
            daily_trip_id: { type: 'number' },
            message: { type: 'string' },
          },
          required: ['type'],
          additionalProperties: false,
        },
      },
    },
    required: ['analysis', 'proposed_actions'],
    additionalProperties: false,
  },
}
