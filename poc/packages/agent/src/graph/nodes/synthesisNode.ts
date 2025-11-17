import { GraphStateType } from '../state';
import { LLMResponse, NodeExecution } from '@poc/shared';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { createLogger } from '@poc/shared';

const logger = createLogger('agent:synthesisNode');

/**
 * Synthesis Node
 * Takes research results and synthesizes final answer using LLM
 */
export async function synthesisNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const startTime = Date.now();
  logger.info('Starting synthesis node');

  try {
    const sanitizedInput = state.validationResult?.sanitizedInput || state.input.message;
    const queryType = state.validationResult?.queryType || 'facts';
    const researchResults = state.researchResults;
    const settings = state.input.settings;

    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY environment variable is required');
    }

    // Temperature based on query type
    const temperatureMap: Record<'facts' | 'analysis' | 'odds', number> = {
      facts: 0.3,
      analysis: 0.7,
      odds: 0.5
    };
    const temperature = settings?.temperature || temperatureMap[queryType];

    const llm = new ChatGoogleGenerativeAI({
      model: 'models/gemini-2.5-flash',
      temperature,
      // maxOutputTokens: settings?.maxTokens || 500, // Temporarily removed - causing MAX_TOKENS issue
      apiKey: process.env.GOOGLE_API_KEY
    });

    // Build context from research results
    let context = '';
    if (researchResults) {
      context = `\n\nResearch Context:\n${JSON.stringify(researchResults, null, 2)}`;
    }

    const systemPrompt = queryType === 'odds'
      ? 'You are a sports research assistant. For probability/odds questions, provide educational estimates and ALWAYS include a disclaimer that this is not betting advice.'
      : 'You are a sports research assistant. Provide accurate, concise sports information and analysis based on the research provided.';

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Question: ${sanitizedInput}${context}\n\nProvide a comprehensive answer based on the research.`)
    ];

    const response = await llm.invoke(messages);
    const content = response.content as string;
    const model = 'models/gemini-2.5-flash';

    const tokensUsed = (response.usage_metadata?.total_tokens as number) ||
                       estimateTokens(content);

    const llmResponse: LLMResponse = {
      content,
      model,
      tokensUsed,
      timestamp: Date.now()
    };

    const nodeExecution: NodeExecution = {
      nodeName: 'synthesisNode',
      startTime,
      endTime: Date.now(),
      status: 'success'
    };

    logger.info('Synthesis completed', {
      model,
      tokensUsed,
      responseLength: content.length
    });

    return {
      llmResponse,
      metadata: {
        ...state.metadata,
        nodeExecutions: [nodeExecution]
      }
    };
  } catch (error) {
    logger.error('Synthesis node failed', { error });

    return {
      error: `Synthesis error: ${error}`,
      metadata: {
        ...state.metadata,
        nodeExecutions: [{
          nodeName: 'synthesisNode',
          startTime,
          endTime: Date.now(),
          status: 'failure',
          error: String(error)
        }]
      }
    };
  }
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
