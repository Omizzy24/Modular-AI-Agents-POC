import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities';
import { WorkflowInput, WorkflowOutput, AgentState } from '@poc/shared';

// Proxy activities with timeout and retry configuration
const {
  validateInputActivity,
  processWithLLMActivity,
  checkGuardrailsActivity,
  formatResponseActivity
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 seconds',
  retry: {
    initialInterval: '1 second',
    maximumInterval: '10 seconds',
    backoffCoefficient: 2,
    maximumAttempts: 3
  }
});

/**
 * Main Agent Workflow
 * Orchestrates the agent execution with durable state management
 * Demonstrates how each node becomes a durable activity
 */
export async function agentWorkflow(input: WorkflowInput): Promise<WorkflowOutput> {
  const startTime = Date.now();
  const state: Partial<AgentState> = {
    input: input.agentInput,
    metadata: {
      startTime,
      nodeExecutions: []
    }
  };

  // Step 1: Validate Input
  const validationResult = await validateInputActivity(input.agentInput);
  if (validationResult.success && validationResult.data) {
    state.validationResult = validationResult.data;
  }

  // Conditional: Only proceed if validation passed
  if (validationResult.data?.isValid) {

    // Step 2: Process with LLM (Gemini)
    const llmResult = await processWithLLMActivity(
      input.agentInput,
      validationResult.data
    );

    if (llmResult.success && llmResult.data) {
      state.llmResponse = llmResult.data;

      // Step 3: Check Guardrails (if enabled)
      if (input.agentInput.settings?.enableGuardrails !== false) {
        const guardrailResult = await checkGuardrailsActivity(
          llmResult.data,
          validationResult.data
        );
        if (guardrailResult.success && guardrailResult.data) {
          state.guardrailResult = guardrailResult.data;
        }
      }
    }
  }

  // Step 4: Format Response
  const formatResult = await formatResponseActivity(state);

  const executionTime = Date.now() - startTime;

  return {
    requestId: input.requestId,
    result: formatResult.data || {
      success: false,
      message: 'Workflow execution failed',
      metadata: { processingTime: executionTime, nodesExecuted: [] }
    },
    executionTime,
    workflowId: input.requestId
  };
}
