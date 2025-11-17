import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities';
import { WorkflowInput, WorkflowOutput, AgentState } from '@poc/shared';

// Proxy the single activity that wraps entire LangGraph
const { executeAgentGraphActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes', // LangGraph execution can take time with tool calls
  retry: {
    initialInterval: '2 seconds',
    maximumInterval: '30 seconds',
    backoffCoefficient: 2,
    maximumAttempts: 3
  }
});

/**
 * Agent Orchestration Workflow (Hybrid Architecture - Layer 1)
 *
 * This is the main workflow that provides session-level durability.
 * It wraps the entire LangGraph execution as a single activity.
 *
 * Inside the activity, LangGraph tools trigger child Temporal workflows,
 * providing action-level durability (Layer 2).
 *
 * Architecture:
 * Layer 1 (This Workflow): Session durability - survives crashes
 * Layer 2 (Tool Workflows): Action durability - each tool call is durable
 */
export async function agentOrchestrationWorkflow(input: WorkflowInput): Promise<WorkflowOutput> {
  const startTime = Date.now();

  // Execute the entire agent graph as one activity
  // Inside this activity, LangGraph will trigger child workflows for tools
  const result = await executeAgentGraphActivity(input.agentInput);

  const executionTime = Date.now() - startTime;

  return {
    requestId: input.requestId,
    result: result.data || {
      success: false,
      message: 'Agent orchestration failed',
      metadata: { processingTime: executionTime, nodesExecuted: [] }
    },
    executionTime,
    workflowId: input.requestId
  };
}
