import { Connection, Client } from '@temporalio/client';
import { agentOrchestrationWorkflow } from './workflows/agentOrchestrationWorkflow';
import { WorkflowInput, WorkflowOutput } from '@poc/shared';
import { createLogger } from '@poc/shared';

const logger = createLogger('temporal:client');

let client: Client | null = null;

/**
 * Get or create Temporal client
 */
export async function getTemporalClient(): Promise<Client> {
  if (client) {
    return client;
  }

  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233'
  });

  client = new Client({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE || 'default'
  });

  logger.info('Temporal client connected', {
    address: process.env.TEMPORAL_ADDRESS,
    namespace: process.env.TEMPORAL_NAMESPACE
  });

  return client;
}

/**
 * Execute agent workflow via Temporal (Hybrid Architecture)
 */
export async function executeAgentWorkflow(
  input: WorkflowInput
): Promise<WorkflowOutput> {
  const client = await getTemporalClient();

  logger.info('Starting agent orchestration workflow', { requestId: input.requestId });

  const handle = await client.workflow.start(agentOrchestrationWorkflow, {
    args: [input],
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'ai-orchestration-queue',
    workflowId: input.requestId
  });

  logger.info('Workflow started', {
    workflowId: handle.workflowId,
    requestId: input.requestId
  });

  const result = await handle.result();

  logger.info('Workflow completed', {
    workflowId: handle.workflowId,
    executionTime: result.executionTime,
    success: result.result.success
  });

  return result;
}
