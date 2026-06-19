import { AiTriggerRow, PatchResponse } from '../schemas/patch.schema'
import { PreDayEvaluationService } from './PreDayEvaluationService'
import { LowOccupancyService } from './LowOccupancyService'
import { BusFullService } from './BusFullService'
import { HighDemandService } from './HighDemandService'

export class TriggerRouter {
  static async evaluate(trigger: AiTriggerRow): Promise<PatchResponse> {
    switch (trigger.trigger_type) {
      case 'pre_day_evaluation':
        return PreDayEvaluationService.evaluate(trigger)
      case 'low_occupancy':
        return LowOccupancyService.evaluate(trigger)
      case 'bus_full':
        return BusFullService.evaluate(trigger)
      case 'high_demand':
        return HighDemandService.evaluate(trigger)
      default:
        return {
          analysis: `Unknown trigger type: ${trigger.trigger_type}`,
          proposed_actions: [],
        }
    }
  }
}
