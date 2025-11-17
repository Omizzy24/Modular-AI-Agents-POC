import { GraphStateType } from '../state';
import { NodeExecution } from '@poc/shared';
import { createLogger } from '@poc/shared';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const logger = createLogger('agent:researchNode');

/**
 * Research Node
 * Uses LLM to determine which tools to call and orchestrates research
 * This node can cycle back to itself if more research is needed
 */
export async function researchNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const startTime = Date.now();
  logger.info('Starting research node');

  try {
    const sanitizedInput = state.validationResult?.sanitizedInput || state.input.message;
    const queryType = state.validationResult?.queryType || 'facts';
    const tools = state.tools || []; // Tools injected by Temporal bridge

    if (!process.env.GOOGLE_API_KEY) {
      throw new Error('GOOGLE_API_KEY environment variable is required');
    }

    // Use tools if available (from Temporal bridge)
    if (tools.length > 0) {
      logger.info('Research node with Temporal tools', { toolCount: tools.length });

      const llm = new ChatGoogleGenerativeAI({
        model: 'models/gemini-2.5-flash',
        temperature: 0.5, // Balanced for tool selection
        apiKey: process.env.GOOGLE_API_KEY
      });

      // Bind tools to LLM for automatic tool calling
      const llmWithTools = llm.bindTools(tools);

      const systemPrompt = `You are a sports research assistant with access to tools.
For the user's question, determine which tools to use and call them to gather accurate information.
Available tools: web_search, verify_stats, calculate_odds.
Call tools as needed to provide a comprehensive answer.`;

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(sanitizedInput)
      ];

      // Invoke LLM with tool binding
      const response = await llmWithTools.invoke(messages);

      // Extract tool results or direct response
      let researchResults: any = {
        toolCalls: [],
        finalAnswer: response.content
      };

      // Check if tools were called
      if (response.tool_calls && response.tool_calls.length > 0) {
        logger.info('Tools were called by LLM', { toolCalls: response.tool_calls.length });

        // ACTUALLY INVOKE THE TOOLS (this triggers Temporal child workflows!)
        const toolExecutionResults = await Promise.all(
          response.tool_calls.map(async (toolCall: any) => {
            logger.info('Executing tool', { toolName: toolCall.name, args: toolCall.args });

            const tool = tools.find(t => t.name === toolCall.name);
            if (tool) {
              try {
                const result = await tool.invoke(toolCall.args);
                logger.info('Tool execution completed', {
                  toolName: toolCall.name,
                  resultPreview: String(result).substring(0, 100)
                });
                return {
                  toolName: toolCall.name,
                  args: toolCall.args,
                  result: result
                };
              } catch (error) {
                logger.error('Tool execution failed', { toolName: toolCall.name, error });
                return {
                  toolName: toolCall.name,
                  args: toolCall.args,
                  error: String(error)
                };
              }
            }

            logger.warn('Tool not found', { toolName: toolCall.name });
            return {
              toolName: toolCall.name,
              args: toolCall.args,
              error: 'Tool not found'
            };
          })
        );

        researchResults.toolCalls = response.tool_calls;
        researchResults.toolResults = toolExecutionResults;
      }

      const nodeExecution: NodeExecution = {
        nodeName: 'researchNode',
        startTime,
        endTime: Date.now(),
        status: 'success'
      };

      return {
        researchResults,
        metadata: {
          ...state.metadata,
          nodeExecutions: [nodeExecution]
        }
      };
    } else {
      // No tools available - skip research
      logger.info('No tools available, skipping research');

      const nodeExecution: NodeExecution = {
        nodeName: 'researchNode',
        startTime,
        endTime: Date.now(),
        status: 'skipped'
      };

      return {
        researchResults: { message: 'No research performed - no tools available' },
        metadata: {
          ...state.metadata,
          nodeExecutions: [nodeExecution]
        }
      };
    }
  } catch (error) {
    logger.error('Research node failed', { error });

    return {
      error: `Research error: ${error}`,
      metadata: {
        ...state.metadata,
        nodeExecutions: [{
          nodeName: 'researchNode',
          startTime,
          endTime: Date.now(),
          status: 'failure',
          error: String(error)
        }]
      }
    };
  }
}
