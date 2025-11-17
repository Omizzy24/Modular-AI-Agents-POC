import { GraphStateType } from '../state';
import { LLMResponse, NodeExecution, createLogger } from '@poc/shared';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const logger = createLogger('agent:llmProcessor');

/**
 * LLM Processing Node
 * Handles interaction with Google Gemini for sports queries
 * Uses query-specific temperatures and sports-focused prompts
 */
export async function llmProcessorNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const startTime = Date.now();
  logger.info('Starting LLM processing');

  try {
    const sanitizedInput = state.validationResult?.sanitizedInput || state.input.message;
    const queryType = state.validationResult?.queryType || 'facts';
    const settings = state.input.settings;

    // Validate API key is configured
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY environment variable is required');
    }

    // Sports-specific: Set temperature based on query type
    const temperatureMap: Record<'facts' | 'analysis' | 'odds', number> = {
      facts: 0.3,      // Low creativity for factual queries
      analysis: 0.7,   // Higher creativity for analysis
      odds: 0.5        // Balanced for probability calculations
    };
    const temperature = settings?.temperature || temperatureMap[queryType];

    // Always use Google Gemini API
    logger.info('Using Google Gemini API', { queryType, temperature });

    const llm = new ChatGoogleGenerativeAI({
      model: 'models/gemini-2.5-flash', // Gemini 2.5 Flash (stable, June 2025)
      temperature,
      // maxOutputTokens: settings?.maxTokens || 500, // Temporarily removed - causing MAX_TOKENS issue
      apiKey: process.env.GOOGLE_API_KEY
    });

    // Sports-specific system prompt
    const systemPrompt = queryType === 'odds'
      ? 'You are a sports research assistant. For probability/odds questions, provide educational estimates and ALWAYS include a disclaimer that this is not betting advice.'
      : 'You are a sports research assistant. Provide accurate, concise sports information and analysis.';

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(sanitizedInput)
    ];

    const response = await llm.invoke(messages);

    // Handle both string and array content formats
    let content: string;
    if (typeof response.content === 'string') {
      content = response.content;
    } else if (Array.isArray(response.content)) {
      // Extract text from content parts
      content = response.content
        .map((part: any) => (typeof part === 'string' ? part : part.text || ''))
        .join('');
    } else {
      content = String(response.content);
    }
    const model = 'models/gemini-2.5-flash';

    // Gemini returns usage metadata differently than OpenAI
    const tokensUsed = (response.usage_metadata?.total_tokens as number) ||
                       estimateTokens(content);

    const llmResponse: LLMResponse = {
      content,
      model,
      tokensUsed,
      timestamp: Date.now()
    };

    const nodeExecution: NodeExecution = {
      nodeName: 'llmProcessor',
      startTime,
      endTime: Date.now(),
      status: 'success'
    };

    logger.info('LLM processing completed', {
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
    logger.error('LLM processing failed', { error });

    return {
      error: `LLM processing error: ${error}`,
      metadata: {
        ...state.metadata,
        nodeExecutions: [{
          nodeName: 'llmProcessor',
          startTime,
          endTime: Date.now(),
          status: 'failure',
          error: String(error)
        }]
      }
    };
  }
}

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
