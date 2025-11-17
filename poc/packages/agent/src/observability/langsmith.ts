import { Client } from 'langsmith';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { createLogger } from '@poc/shared';

const logger = createLogger('agent:langsmith');

/**
 * Initialize LangSmith client and tracing
 * Provides observability for all LangChain operations
 */
export function initializeLangSmith() {
  // Check if LangSmith is configured
  if (!process.env.LANGCHAIN_API_KEY) {
    logger.warn('LangSmith API key not configured, tracing disabled');
    return null;
  }

  // Verify tracing is enabled
  if (process.env.LANGCHAIN_TRACING_V2 !== 'true') {
    logger.info('LangSmith tracing not enabled');
    return null;
  }

  try {
    const client = new Client({
      apiUrl: process.env.LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com',
      apiKey: process.env.LANGCHAIN_API_KEY
    });

    logger.info('LangSmith client initialized', {
      project: process.env.LANGCHAIN_PROJECT,
      endpoint: process.env.LANGCHAIN_ENDPOINT
    });

    return client;
  } catch (error) {
    logger.error('Failed to initialize LangSmith', { error });
    return null;
  }
}

/**
 * Create a LangSmith callback handler for tracing
 */
export function createTracingHandler(runName?: string) {
  if (process.env.LANGCHAIN_TRACING_V2 !== 'true') {
    return undefined;
  }

  return new LangChainTracer({
    projectName: process.env.LANGCHAIN_PROJECT || 'ai-orchestration-poc'
  });
}

/**
 * Log custom metadata to LangSmith
 */
export async function logToLangSmith(
  client: Client | null,
  runId: string,
  metadata: Record<string, any>
) {
  if (!client) {
    return;
  }

  try {
    await client.updateRun(runId, {
      extra: metadata
    });
    logger.debug('Logged metadata to LangSmith', { runId });
  } catch (error) {
    logger.error('Failed to log to LangSmith', { error, runId });
  }
}
