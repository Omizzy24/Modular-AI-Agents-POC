import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../../activities/tools';

const { fetchHistoricalDataActivity, calculateProbabilityActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '20 seconds',
  retry: {
    initialInterval: '2 seconds',
    maximumInterval: '10 seconds',
    backoffCoefficient: 2,
    maximumAttempts: 3
  }
});

export interface OddsCalculationInput {
  scenario: string;
  team: string;
  league: string;
}

export interface OddsCalculationResult {
  probability: number;
  confidence: number;
  factors: string[];
  disclaimer: string;
}

/**
 * Odds Calculation Tool Workflow
 * Calculates sports outcome probabilities
 * Task Queue: compute-tools
 */
export async function oddsCalculationWorkflow(
  input: OddsCalculationInput
): Promise<OddsCalculationResult> {
  // Activity 1: Fetch historical data
  const historicalData = await fetchHistoricalDataActivity(input.team, input.league);

  // Activity 2: Calculate probability using statistical model
  const calculation = await calculateProbabilityActivity(
    input.scenario,
    historicalData
  );

  return {
    probability: calculation.probability,
    confidence: calculation.confidence,
    factors: calculation.factors,
    disclaimer: 'This analysis is for educational purposes only, not betting advice.'
  };
}
