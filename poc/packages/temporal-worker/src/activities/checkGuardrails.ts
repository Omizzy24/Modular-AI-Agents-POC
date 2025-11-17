import { Context } from '@temporalio/activity';
import { guardrailNode } from '@poc/agent';
import { LLMResponse, GuardrailResult, ActivityResult, ValidationResult } from '@poc/shared';
import { createLogger } from '@poc/shared';

const logger = createLogger('temporal:activity:guardrails');

/**
 * Temporal Activity: Guardrail Checks
 * Ensures safety checks are always executed durably
 */
export async function checkGuardrailsActivity(
  llmResponse: LLMResponse,
  validationResult?: ValidationResult
): Promise<ActivityResult<GuardrailResult>> {
  const { info } = Context.current();
  logger.info('Starting guardrails activity', {
    workflowId: info.workflowExecution.workflowId
  });

  try {
    const state = {
      llmResponse,
      validationResult,
      metadata: {
        startTime: Date.now(),
        nodeExecutions: []
      }
    };

    const result = await guardrailNode(state as any);

    if (result.error) {
      throw new Error(result.error);
    }

    logger.info('Guardrails activity completed', {
      passed: result.guardrailResult?.passed,
      violations: result.guardrailResult?.violations?.length
    });

    return {
      success: true,
      data: result.guardrailResult
    };
  } catch (error) {
    logger.error('Guardrails activity failed', { error });
    return {
      success: false,
      error: String(error)
    };
  }
}
