import { Context } from '@temporalio/activity';
import { createLogger } from '@poc/shared';

const logger = createLogger('temporal:activity:webSearch');

interface SearchResult {
  title: string;
  snippet: string;
  source: string;
  relevance: number;
}

/**
 * Fetch search results (simulated)
 */
export async function fetchSearchResultsActivity(
  query: string,
  maxResults: number
): Promise<SearchResult[]> {
  const { info } = Context.current();
  logger.info('Fetching search results', { query, maxResults, workflowId: info.workflowExecution.workflowId });

  // Simulate search delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Mock search results based on query
  const results: SearchResult[] = [
    {
      title: `${query} - Official League Stats`,
      snippet: `Comprehensive statistics and data for ${query}`,
      source: 'official-league.com',
      relevance: 0.95
    },
    {
      title: `${query} Analysis - Sports Insights`,
      snippet: `Expert analysis and breakdown of ${query}`,
      source: 'sports-insights.com',
      relevance: 0.87
    },
    {
      title: `${query} Historical Data`,
      snippet: `Historical performance data for ${query}`,
      source: 'stats-database.com',
      relevance: 0.82
    }
  ];

  return results.slice(0, maxResults);
}

/**
 * Rank and filter results by relevance
 */
export async function rankResultsActivity(results: SearchResult[]): Promise<SearchResult[]> {
  const { info } = Context.current();
  logger.info('Ranking results', { count: results.length, workflowId: info.workflowExecution.workflowId });

  // Sort by relevance
  return results
    .sort((a, b) => b.relevance - a.relevance)
    .filter(r => r.relevance > 0.7);
}
