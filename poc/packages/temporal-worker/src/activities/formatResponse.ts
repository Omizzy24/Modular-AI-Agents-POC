import { Context } from '@temporalio/activity';
import { responseFormatterNode } from '@poc/agent';
import { AgentState, FormattedResponse, ActivityResult } from '@poc/shared';
import { createLogger } from '@poc/shared';

const logger = createLogger('temporal:activity:formatResponse');

/**
 * Temporal Activity: Response Formatting
 * Final activity that formats the response
 */
export async function formatResponseActivity(
  state: Partial<AgentState>
): Promise<ActivityResult<FormattedResponse>> {
  const { info } = Context.current();
  logger.info('Starting format response activity', {
    workflowId: info.workflowExecution.workflowId
  });

  try {
    const fullState = {
      ...state,
      metadata: state.metadata || {
        startTime: Date.now(),
        nodeExecutions: []
      }
    };

    const result = await responseFormatterNode(fullState as any);

    logger.info('Format response activity completed', {
      success: result.formattedResponse?.success
    });

    return {
      success: true,
      data: result.formattedResponse
    };
  } catch (error) {
    logger.error('Format response activity failed', { error });
    return {
      success: false,
      error: String(error)
    };
  }
}
