import { GraphStateType } from '../state';
import { GuardrailResult, NodeExecution, createLogger } from '@poc/shared';

const logger = createLogger('agent:guardrail');

/**
 * Guardrail Node
 * Implements safety checks and content moderation
 * Includes sports-specific gambling disclaimer checks
 */
export async function guardrailNode(state: GraphStateType): Promise<Partial<GraphStateType>> {
  const startTime = Date.now();
  logger.info('Starting guardrail checks');

  try {
    // Ensure content is always a string
    const rawContent = state.llmResponse?.content || '';
    const content = typeof rawContent === 'string' ? rawContent : String(rawContent);
    const queryType = state.validationResult?.queryType || 'facts';
    const violations: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';
    let modifiedContent = content;

    // Implement various guardrail checks

    // 1. Check for PII (simplified pattern matching)
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g,  // SSN pattern
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,  // Email
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,  // Credit card
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g  // Phone number
    ];

    for (const pattern of piiPatterns) {
      if (pattern.test(content)) {
        violations.push('Potential PII detected');
        severity = 'high';
        modifiedContent = modifiedContent.replace(pattern, '[REDACTED]');
      }
    }

    // 2. Check for inappropriate content (simplified)
    const inappropriateTerms = [
      'inappropriate',
      'offensive',
      'harmful',
      'dangerous'
    ];

    const lowerContent = content.toLowerCase();
    for (const term of inappropriateTerms) {
      if (lowerContent.includes(term)) {
        violations.push(`Potentially inappropriate content: ${term}`);
        severity = severity === 'high' ? 'high' : 'medium';
      }
    }

    // 3. Check response length
    if (content.length > 2000) {
      violations.push('Response exceeds maximum length');
      severity = severity === 'high' ? 'high' : 'medium';
      modifiedContent = modifiedContent.substring(0, 2000) + '... [truncated]';
    }

    // 4. Check for prompt injection attempts in response
    const injectionPatterns = [
      /ignore previous instructions/i,
      /disregard all prior/i,
      /new instructions:/i,
      /system prompt:/i
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(content)) {
        violations.push('Potential prompt injection detected in response');
        severity = 'high';
      }
    }

    // 5. Sports-specific: Check for gambling disclaimer on odds queries
    if (queryType === 'odds') {
      const hasDisclaimer = /not (betting|gambling) advice|educational purposes|disclaimer/i.test(content);
      if (!hasDisclaimer) {
        violations.push('Missing gambling disclaimer for odds query');
        severity = severity === 'high' ? 'high' : 'medium';
        // Add disclaimer to modified content
        modifiedContent += '\n\nDisclaimer: This analysis is for educational and research purposes only, not betting advice.';
      }
    }

    const guardrailResult: GuardrailResult = {
      passed: violations.length === 0,
      violations: violations.length > 0 ? violations : undefined,
      severity: violations.length > 0 ? severity : undefined,
      modifiedContent: modifiedContent !== content ? modifiedContent : undefined
    };

    const nodeExecution: NodeExecution = {
      nodeName: 'guardrail',
      startTime,
      endTime: Date.now(),
      status: guardrailResult.passed ? 'success' : 'failure',
      error: violations.length > 0 ? violations.join(', ') : undefined
    };

    logger.info('Guardrail checks completed', {
      passed: guardrailResult.passed,
      violationCount: violations.length,
      severity
    });

    return {
      guardrailResult,
      metadata: {
        ...state.metadata,
        nodeExecutions: [nodeExecution]
      }
    };
  } catch (error) {
    logger.error('Guardrail check failed', { error });

    return {
      error: `Guardrail error: ${error}`,
      metadata: {
        ...state.metadata,
        nodeExecutions: [{
          nodeName: 'guardrail',
          startTime,
          endTime: Date.now(),
          status: 'failure',
          error: String(error)
        }]
      }
    };
  }
}
