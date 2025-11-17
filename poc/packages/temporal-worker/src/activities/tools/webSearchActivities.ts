import { Context } from '@temporalio/activity';
import { createLogger } from '@poc/shared';
import { TavilySearchAPIWrapper } from '@langchain/tavily';

const logger = createLogger('temporal:activity:webSearch');

interface SearchResult {
  title: string;
  snippet: string;
  source: string;
  relevance: number;
}

/**
 * Fetch search results using Tavily API
 */
export async function fetchSearchResultsActivity(
  query: string,
  maxResults: number
): Promise<SearchResult[]> {
  const { info } = Context.current();
  logger.info('Fetching search results from Tavily', { query, maxResults, workflowId: info.workflowExecution.workflowId });

  try {
    // Initialize Tavily API wrapper
    const tavily = new TavilySearchAPIWrapper({
      tavilyApiKey: process.env.TAVILY_API_KEY,
    });

    // Execute search
    const response = await tavily.rawResults({
      query: query,
      maxResults: maxResults,
    });

    // Extract results array from response
    const tavilyResults = response.results || [];

    // Map Tavily results to our SearchResult format
    const results: SearchResult[] = tavilyResults.map((result: any, index: number) => ({
      title: result.title || 'Untitled',
      snippet: result.content || result.snippet || '',
      source: result.url || 'unknown',
      relevance: result.score !== undefined ? result.score : (1.0 - (index * 0.05)) // Use score if available, otherwise decreasing relevance
    }));

    logger.info('Successfully fetched Tavily results', { count: results.length });
    return results;

  } catch (error) {
    logger.error('Error fetching Tavily results', { error });

    // Fallback to basic results on error
    return [{
      title: `Search for: ${query}`,
      snippet: 'Unable to fetch real-time results. Please check API configuration.',
      source: 'system',
      relevance: 0.5
    }];
  }
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
