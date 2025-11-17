import { Context } from '@temporalio/activity';
import { createLogger } from '@poc/shared';
import { TavilySearchAPIWrapper } from '@langchain/tavily';

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
 * Helper to extract win-loss records from text
 * Matches patterns like "15-5", "45-28 record", "W: 15, L: 5", etc.
 */
function parseWinLossRecord(text: string): { wins: number; losses: number } | null {
  // Pattern 1: "15-5" or "45-28 record"
  const dashPattern = /(\d{1,3})\s*-\s*(\d{1,3})/;
  const dashMatch = text.match(dashPattern);
  if (dashMatch) {
    return {
      wins: parseInt(dashMatch[1]),
      losses: parseInt(dashMatch[2])
    };
  }

  // Pattern 2: "W: 15, L: 5" or "Wins: 45, Losses: 28"
  const labelPattern = /(?:W|Wins?):\s*(\d{1,3}).*?(?:L|Losses?):\s*(\d{1,3})/i;
  const labelMatch = text.match(labelPattern);
  if (labelMatch) {
    return {
      wins: parseInt(labelMatch[1]),
      losses: parseInt(labelMatch[2])
    };
  }

  return null;
}

/**
 * Fetch historical data using Tavily search
 */
export async function fetchHistoricalDataActivity(
  team: string,
  league: string
): Promise<HistoricalData> {
  const { info } = Context.current();
  logger.info('Fetching historical data from Tavily', { team, league, workflowId: info.workflowExecution.workflowId });

  try {
    // Initialize Tavily API wrapper
    const tavily = new TavilySearchAPIWrapper({
      tavilyApiKey: process.env.TAVILY_API_KEY,
    });

    // Search for team records and current season stats
    const searchQuery = `${team} ${league} current season record wins losses statistics`;
    const response = await tavily.rawResults({
      query: searchQuery,
      maxResults: 10,
    });

    // Extract results array from response
    const tavilyResults = response.results || [];

    // Try to extract win-loss records from results
    let wins = 0;
    let losses = 0;
    let foundRecord = false;

    for (const result of tavilyResults) {
      const content = ((result as any).content || (result as any).snippet || (result as any).description || '').toLowerCase();
      const title = ((result as any).title || '').toLowerCase();
      const combinedText = `${title} ${content}`;

      const record = parseWinLossRecord(combinedText);
      if (record && record.wins > 0 && record.losses >= 0) {
        // Use the first reasonable record found
        if (!foundRecord || (record.wins + record.losses > 40 && record.wins + record.losses < 100)) {
          wins = record.wins;
          losses = record.losses;
          foundRecord = true;
          logger.info('Found team record', { team, wins, losses, source: result.url || 'unknown' });
          break;
        }
      }
    }

    // If no record found, use reasonable defaults based on league
    if (!foundRecord) {
      logger.warn('No win-loss record found, using defaults', { team, league });
      wins = 42;
      losses = 35;
    }

    // Calculate win rate and simulate recent form
    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? wins / totalGames : 0.5;

    // Generate plausible recent form based on overall win rate
    const recentForm: number[] = [];
    for (let i = 0; i < 5; i++) {
      // Add some randomness around the win rate
      const rand = Math.random();
      const adjustedWinRate = winRate + (Math.random() - 0.5) * 0.2;
      recentForm.push(rand < adjustedWinRate ? 1 : 0);
    }

    logger.info('Historical data retrieved', { team, winRate: winRate.toFixed(3), record: `${wins}-${losses}` });

    return {
      winRate,
      recentForm,
      seasonStats: {
        wins,
        losses
      }
    };

  } catch (error) {
    logger.error('Error fetching historical data from Tavily', { error, team, league });

    // Fallback to reasonable defaults on error
    return {
      winRate: 0.50,
      recentForm: [1, 0, 1, 0, 1],
      seasonStats: {
        wins: 41,
        losses: 41
      }
    };
  }
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
