import { Context } from '@temporalio/activity';
import { createLogger } from '@poc/shared';

const logger = createLogger('temporal:activity:oddsCalculation');

interface HistoricalData {
  winRate: number;
  recentForm: number[];
  seasonStats: {
    wins: number;
    losses: number;
  };
}

interface ProbabilityResult {
  probability: number;
  confidence: number;
  factors: string[];
}

/**
 * Fetch historical data (simulated)
 */
export async function fetchHistoricalDataActivity(
  team: string,
  league: string
): Promise<HistoricalData> {
  const { info } = Context.current();
  logger.info('Fetching historical data', { team, league, workflowId: info.workflowExecution.workflowId });

  // Simulate data fetch delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Mock historical data
  return {
    winRate: 0.62,
    recentForm: [1, 1, 0, 1, 1], // Last 5 games (1=win, 0=loss)
    seasonStats: {
      wins: 45,
      losses: 28
    }
  };
}

/**
 * Calculate probability using statistical model (simulated)
 */
export async function calculateProbabilityActivity(
  scenario: string,
  historicalData: HistoricalData
): Promise<ProbabilityResult> {
  const { info } = Context.current();
  logger.info('Calculating probability', { scenario, workflowId: info.workflowExecution.workflowId });

  // Simulate calculation delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Simple mock calculation based on historical data
  const baseProb = historicalData.winRate;
  const recentFormBonus = historicalData.recentForm.filter(r => r === 1).length * 0.02;
  const probability = Math.min(0.95, baseProb + recentFormBonus);

  return {
    probability,
    confidence: 0.78,
    factors: [
      `Historical win rate: ${(historicalData.winRate * 100).toFixed(1)}%`,
      `Recent form: ${historicalData.recentForm.filter(r => r === 1).length}/5 wins`,
      `Season record: ${historicalData.seasonStats.wins}-${historicalData.seasonStats.losses}`
    ]
  };
}
