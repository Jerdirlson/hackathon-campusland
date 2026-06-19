import { PatchResponse } from './patch.schema'

export type BusFullResponse = PatchResponse

export const busFullJsonSchema = {
  name: 'bus_full_response',
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
              enum: ['notify_users', 'add_trip'],
            },
            daily_trip_id: { type: 'number' },
            message: { type: 'string' },
            route_id: { type: 'number' },
            bus_id: { type: 'number' },
            departure: { type: 'string' },
            date: { type: 'string' },
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
