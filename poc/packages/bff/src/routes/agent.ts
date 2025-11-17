import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AgentInputSchema, WorkflowInput, createLogger } from '@poc/shared';
import { executeAgentWorkflow } from '@poc/temporal-worker/client';
import { validateRequest } from '../middleware/validation';

const logger = createLogger('bff:agent');
const router = Router();

/**
 * POST /api/agent/execute
 * Execute the agent workflow with the provided input
 */
router.post('/execute', validateRequest(AgentInputSchema), async (req, res, next) => {
  try {
    const requestId = uuidv4();
    const agentInput = req.body;

    logger.info('Received agent execution request', {
      requestId,
      userId: agentInput.userId
    });

    // Create workflow input
    const workflowInput: WorkflowInput = {
      requestId,
      agentInput,
      timestamp: Date.now()
    };

    // Execute via Temporal
    const result = await executeAgentWorkflow(workflowInput);

    logger.info('Agent execution completed', {
      requestId,
      success: result.result.success,
      executionTime: result.executionTime
    });

    res.json({
      requestId,
      ...result.result,
      workflowId: result.workflowId,
      executionTime: result.executionTime
    });
  } catch (error) {
    logger.error('Agent execution failed', { error });
    next(error);
  }
});

/**
 * GET /api/agent/status/:workflowId
 * Check the status of a workflow execution
 */
router.get('/status/:workflowId', async (req, res, next) => {
  try {
    const { workflowId } = req.params;

    // In a real implementation, query Temporal for workflow status
    // For POC, return mock status
    res.json({
      workflowId,
      status: 'completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export const agentRouter = router;
