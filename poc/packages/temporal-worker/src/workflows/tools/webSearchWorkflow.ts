import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../../activities/tools';

// Proxy activities for web search
const { fetchSearchResultsActivity, rankResultsActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 seconds',
  retry: {
    initialInterval: '1 second',
    maximumInterval: '5 seconds',
    backoffCoefficient: 2,
    maximumAttempts: 3
  }
});

export interface WebSearchInput {
  query: string;
  maxResults?: number;
}

export interface WebSearchResult {
  results: Array<{
    title: string;
    snippet: string;
    source: string;
    relevance: number;
  }>;
  totalResults: number;
}

/**
 * Web Search Tool Workflow
 * Demonstrates multi-activity tool execution
 * Task Queue: fast-tools
 */
export async function webSearchWorkflow(input: WebSearchInput): Promise<WebSearchResult> {
  // Activity 1: Fetch search results (simulated)
  const rawResults = await fetchSearchResultsActivity(input.query, input.maxResults || 5);

  // Activity 2: Rank and filter results
  const rankedResults = await rankResultsActivity(rawResults);

  return {
    results: rankedResults,
    totalResults: rankedResults.length
  };
}
