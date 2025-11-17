import { GraphStateType } from '../state';
import { ValidationResult, NodeExecution, createLogger } from '@poc/shared';

const logger = createLogger('agent:inputValidator');

/**
 * Input Validation Node
 * First node in the graph that validates and sanitizes user input
 * Includes sports query classification and entity extraction
 */
export async function inputValidatorNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const startTime = Date.now();
  logger.info('Starting input validation', { input: state.input });

  try {
    const { message, settings } = state.input;
    const errors: string[] = [];

    // Validation rules
    if (!message || message.trim().length === 0) {
      errors.push('Message cannot be empty');
    }

    if (message.length > 1000) {
      errors.push('Message exceeds maximum length of 1000 characters');
    }

    // Check for potential injection attempts (simplified)
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /eval\(/i,
      /import\s/i
    ];

    const hasDangerousContent = dangerousPatterns.some(pattern =>
      pattern.test(message)
    );

    if (hasDangerousContent) {
      errors.push('Message contains potentially dangerous content');
    }

    // Sanitize input by removing extra whitespace and normalizing
    const sanitizedInput = message
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 1000);

    // Sports-specific: Classify query type
    const lowerMessage = sanitizedInput.toLowerCase();
    let queryType: 'facts' | 'analysis' | 'odds' = 'facts';

    if (lowerMessage.match(/\b(odds|chances|probability|likely|win|bet)\b/i)) {
      queryType = 'odds';
    } else if (lowerMessage.match(/\b(analyze|analysis|why|how|factor|key|reason)\b/i)) {
      queryType = 'analysis';
    }

    logger.info('Sports query classified', { queryType, message: sanitizedInput });

    const validationResult: ValidationResult = {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      sanitizedInput,
      queryType  // Add query type to validation result
    };

    const nodeExecution: NodeExecution = {
      nodeName: 'inputValidator',
      startTime,
      endTime: Date.now(),
      status: validationResult.isValid ? 'success' : 'failure',
      error: errors.length > 0 ? errors.join(', ') : undefined
    };

    logger.info('Input validation completed', {
      isValid: validationResult.isValid,
      errors: validationResult.errors
    });

    return {
      validationResult,
      metadata: {
        ...state.metadata,
        nodeExecutions: [nodeExecution]
      }
    };
  } catch (error) {
    logger.error('Input validation failed', { error });

    return {
      error: `Validation error: ${error}`,
      metadata: {
        ...state.metadata,
        nodeExecutions: [{
          nodeName: 'inputValidator',
          startTime,
          endTime: Date.now(),
          status: 'failure',
          error: String(error)
        }]
      }
    };
  }
}
