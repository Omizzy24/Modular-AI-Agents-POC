import { Context } from '@temporalio/activity';
import { executeAgent } from '@poc/agent';
import { createTemporalWorkflowTools } from '@poc/agent';
import { AgentInput, FormattedResponse, ActivityResult } from '@poc/shared';
import { createLogger } from '@poc/shared';
import { getTemporalClient } from '../client';

const logger = createLogger('temporal:activity:executeAgentGraph');

/**
 * Execute Agent Graph Activity
 * Wraps the ENTIRE LangGraph execution as a single Temporal activity
 * This is Layer 1 of the hybrid architecture
 */
export async function executeAgentGraphActivity(
  input: AgentInput
): Promise<ActivityResult<FormattedResponse>> {
  const { info } = Context.current();
  logger.info('Starting agent graph execution', {
    workflowId: info.workflowExecution.workflowId,
    activityId: info.activityId
  });

  try {
    // Heartbeat for long-running LangGraph execution
    Context.current().heartbeat();

    // Get Temporal client for tool bridge
    const temporalClient = await getTemporalClient();
    const taskQueue = process.env.TEMPORAL_TASK_QUEUE || 'ai-orchestration-queue';

    // Create Temporal workflow tools (Layer 2 durability)
    const tools = createTemporalWorkflowTools(temporalClient, taskQueue);

    logger.info('Created Temporal workflow tools', { toolCount: tools.length });

    // Execute the entire LangGraph with injected tools
    const result = await executeAgent(input, undefined, tools);

    if (result.error) {
      throw new Error(result.error);
    }

    logger.info('Agent graph execution completed', {
      success: result.formattedResponse?.success,
      nodesExecuted: result.metadata?.nodeExecutions?.length
    });

    return {
      success: true,
      data: result.formattedResponse
    };
  } catch (error) {
    logger.error('Agent graph execution failed', { error });

    return {
      success: false,
      error: String(error)
    };
  }
}
