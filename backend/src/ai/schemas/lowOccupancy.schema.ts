import { PatchResponse } from './patch.schema'

export type LowOccupancyResponse = PatchResponse

export const lowOccupancyJsonSchema = {
  name: 'low_occupancy_response',
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
              enum: ['delay_trip', 'cancel_trip', 'assign_users'],
            },
            daily_trip_id: { type: 'number' },
            new_departure: { type: 'string' },
            reason: { type: 'string' },
            trip_plan_ids: {
              type: 'array',
              items: { type: 'number' },
            },
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
