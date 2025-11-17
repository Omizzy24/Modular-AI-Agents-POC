import { Client } from '@temporalio/client';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { createLogger } from '@poc/shared';

// Type-only imports to avoid circular dependency
type WebSearchInput = { query: string; maxResults?: number };
type StatsVerificationInput = { claim: string; sport: string };
type OddsCalculationInput = { scenario: string; team: string; league: string };

const logger = createLogger('agent:temporalBridge');

/**
 * Create LangChain tools that trigger Temporal child workflows
 * This is the bridge between LangGraph and Temporal
 */
export function createTemporalWorkflowTools(temporalClient: Client, taskQueue: string) {

  // Tool 1: Web Search
  const webSearchTool = tool(
    async (input: WebSearchInput) => {
      logger.info('Executing web search tool via Temporal', { query: input.query });

      const workflowId = `web-search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Start child workflow
      const handle = await temporalClient.workflow.start('webSearchWorkflow', {
        args: [input],
        taskQueue,
        workflowId
      });

      // Wait for result
      const result = await handle.result();

      logger.info('Web search completed', { workflowId, resultCount: result.results.length });

      // Format for LLM consumption
      return JSON.stringify({
        results: result.results.map((r: any) => `${r.title}: ${r.snippet} (${r.source})`),
        totalResults: result.totalResults
      });
    },
    {
      name: 'web_search',
      description: 'Search the web for sports information, statistics, and news. Input should be a search query string.',
      schema: z.object({
        query: z.string().describe('The search query'),
        maxResults: z.number().optional().describe('Maximum number of results to return (default: 5)')
      })
    }
  );

  // Tool 2: Stats Verification
  const statsVerificationTool = tool(
    async (input: StatsVerificationInput) => {
      logger.info('Executing stats verification tool via Temporal', { claim: input.claim });

      const workflowId = `stats-verify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const handle = await temporalClient.workflow.start('statsVerificationWorkflow', {
        args: [input],
        taskQueue,
        workflowId
      });

      const result = await handle.result();

      logger.info('Stats verification completed', { workflowId, verified: result.verified });

      return JSON.stringify({
        verified: result.verified,
        confidence: `${(result.confidence * 100).toFixed(1)}%`,
        sources: result.sources,
        details: result.details
      });
    },
    {
      name: 'verify_stats',
      description: 'Verify sports statistics and claims against official sources. Use this to fact-check sports information.',
      schema: z.object({
        claim: z.string().describe('The sports claim or statistic to verify'),
        sport: z.string().describe('The sport category (e.g., "nfl", "nba", "soccer")')
      })
    }
  );

  // Tool 3: Odds Calculation
  const oddsCalculationTool = tool(
    async (input: OddsCalculationInput) => {
      logger.info('Executing odds calculation tool via Temporal', { scenario: input.scenario });

      const workflowId = `odds-calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const handle = await temporalClient.workflow.start('oddsCalculationWorkflow', {
        args: [input],
        taskQueue,
        workflowId
      });

      const result = await handle.result();

      logger.info('Odds calculation completed', { workflowId, probability: result.probability });

      return JSON.stringify({
        probability: `${(result.probability * 100).toFixed(1)}%`,
        confidence: `${(result.confidence * 100).toFixed(1)}%`,
        factors: result.factors,
        disclaimer: result.disclaimer
      });
    },
    {
      name: 'calculate_odds',
      description: 'Calculate probability and odds for sports outcomes. Always includes a disclaimer that this is not betting advice.',
      schema: z.object({
        scenario: z.string().describe('The scenario to calculate odds for'),
        team: z.string().describe('The team name'),
        league: z.string().describe('The league (e.g., "NBA", "NFL", "Premier League")')
      })
    }
  );

  return [webSearchTool, statsVerificationTool, oddsCalculationTool];
}
