import { Context } from '@temporalio/activity';
import { inputValidatorNode } from '@poc/agent';
import { AgentInput, ValidationResult, ActivityResult } from '@poc/shared';
import { createLogger } from '@poc/shared';

const logger = createLogger('temporal:activity:validateInput');

/**
 * Temporal Activity: Input Validation
 * Wraps the validation node as a durable activity
 */
export async function validateInputActivity(
  input: AgentInput
): Promise<ActivityResult<ValidationResult>> {
  const { info } = Context.current();
  logger.info('Starting validation activity', {
    workflowId: info.workflowExecution.workflowId,
    activityId: info.activityId
  });

  try {
    // Create minimal state for the node
    const state = {
      input,
      metadata: {
        startTime: Date.now(),
        nodeExecutions: []
      }
    };

    // Execute validation node
    const result = await inputValidatorNode(state as any);

    if (result.error) {
      throw new Error(result.error);
    }

    logger.info('Validation activity completed', {
      isValid: result.validationResult?.isValid
    });

    return {
      success: true,
      data: result.validationResult
    };
  } catch (error) {
    logger.error('Validation activity failed', { error });
    return {
      success: false,
      error: String(error)
    };
  }
}
