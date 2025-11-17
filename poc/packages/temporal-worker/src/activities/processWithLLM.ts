import { Context } from '@temporalio/activity';
import { llmProcessorNode } from '@poc/agent';
import { AgentInput, ValidationResult, LLMResponse, ActivityResult } from '@poc/shared';
import { createLogger } from '@poc/shared';

const logger = createLogger('temporal:activity:processLLM');

/**
 * Temporal Activity: LLM Processing
 * Wraps the LLM node as a durable activity with retry capabilities
 */
export async function processWithLLMActivity(
  input: AgentInput,
  validationResult: ValidationResult
): Promise<ActivityResult<LLMResponse>> {
  const { info } = Context.current();
  logger.info('Starting LLM processing activity', {
    workflowId: info.workflowExecution.workflowId,
    attempt: info.attempt
  });

  try {
    // Heartbeat for long-running LLM calls
    Context.current().heartbeat();

    // Create state for the node
    const state = {
      input,
      validationResult,
      metadata: {
        startTime: Date.now(),
        nodeExecutions: []
      }
    };

    // Execute LLM node
    const result = await llmProcessorNode(state as any);

    if (result.error) {
      throw new Error(result.error);
    }

    logger.info('LLM activity completed', {
      model: result.llmResponse?.model,
      tokensUsed: result.llmResponse?.tokensUsed
    });

    return {
      success: true,
      data: result.llmResponse
    };
  } catch (error) {
    logger.error('LLM activity failed', { error, attempt: info.attempt });

    // Retry on transient errors
    if (info.attempt < 3) {
      throw error; // Temporal will retry
    }

    return {
      success: false,
      error: String(error)
    };
  }
}
