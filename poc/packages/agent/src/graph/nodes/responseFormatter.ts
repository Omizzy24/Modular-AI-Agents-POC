import { GraphStateType } from '../state';
import { FormattedResponse, NodeExecution, createLogger } from '@poc/shared';

const logger = createLogger('agent:responseFormatter');

/**
 * Response Formatter Node
 * Final node that formats the response for the client
 * Aggregates all metadata and ensures consistent output format
 */
export async function responseFormatterNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const startTime = Date.now();
  logger.info('Starting response formatting');

  try {
    // Determine the final content based on guardrail results
    let finalContent: string;
    let success = true;
    let message: string;

    if (state.error) {
      success = false;
      message = `Processing failed: ${state.error}`;
      finalContent = '';
    } else if (!state.validationResult?.isValid) {
      success = false;
      message = `Validation failed: ${state.validationResult?.errors?.join(', ')}`;
      finalContent = '';
    } else if (!state.guardrailResult?.passed && state.input.settings?.enableGuardrails !== false) {
      // Guardrail failed and guardrails are enabled
      success = true; // Still successful, but with modifications
      message = 'Response processed with safety modifications';
      finalContent = state.guardrailResult?.modifiedContent || state.llmResponse?.content || '';
    } else {
      // Everything passed
      success = true;
      message = 'Response processed successfully';
      finalContent = state.llmResponse?.content || '';
    }

    // Calculate total processing time
    const processingTime = Date.now() - state.metadata.startTime;

    // Get list of executed nodes
    const nodesExecuted = state.metadata.nodeExecutions
      .filter((exec: NodeExecution) => exec.status === 'success')
      .map((exec: NodeExecution) => exec.nodeName);

    const formattedResponse: FormattedResponse = {
      success,
      message: finalContent || message,
      data: {
        originalInput: state.input.message,
        processedContent: finalContent,
        validationStatus: state.validationResult?.isValid ? 'passed' : 'failed',
        guardrailStatus: state.guardrailResult?.passed ? 'passed' : 'modified',
        violations: state.guardrailResult?.violations,
        model: state.llmResponse?.model,
        tokensUsed: state.llmResponse?.tokensUsed
      },
      metadata: {
        processingTime,
        nodesExecuted
      }
    };

    const nodeExecution: NodeExecution = {
      nodeName: 'responseFormatter',
      startTime,
      endTime: Date.now(),
      status: 'success'
    };

    logger.info('Response formatting completed', {
      success,
      processingTime,
      nodesExecuted: nodesExecuted.length
    });

    return {
      formattedResponse,
      metadata: {
        ...state.metadata,
        nodeExecutions: [nodeExecution]
      }
    };
  } catch (error) {
    logger.error('Response formatting failed', { error });

    return {
      error: `Formatting error: ${error}`,
      formattedResponse: {
        success: false,
        message: `Failed to format response: ${error}`,
        metadata: {
          processingTime: Date.now() - state.metadata.startTime,
          nodesExecuted: []
        }
      },
      metadata: {
        ...state.metadata,
        nodeExecutions: [{
          nodeName: 'responseFormatter',
          startTime,
          endTime: Date.now(),
          status: 'failure',
          error: String(error)
        }]
      }
    };
  }
}
