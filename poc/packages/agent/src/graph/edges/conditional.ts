import { GraphStateType } from '../state';
import { createLogger } from '@poc/shared';

const logger = createLogger('agent:edges');

/**
 * Conditional edge after validation
 * Routes to research node or error formatting
 */
export function validationRouter(state: GraphStateType): string {
  logger.debug('Routing from validation node', {
    isValid: state.validationResult?.isValid
  });

  if (state.validationResult?.isValid) {
    return 'researchNode';  // Changed from 'llmProcessor'
  }
  return 'responseFormatter';
}

/**
 * NEW: Router from research to synthesis
 * Could implement cycling logic here if needed
 */
export function researchRouter(state: GraphStateType): string {
  logger.debug('Routing from research node', {
    hasResearchResults: !!state.researchResults,
    hasError: !!state.error
  });

  if (state.error) {
    return 'responseFormatter';
  }

  // For POC, always go to synthesis
  // In production, could check if more research needed and cycle back
  return 'synthesisNode';
}

/**
 * NEW: Router from synthesis to guardrails
 */
export function synthesisRouter(state: GraphStateType): string {
  logger.debug('Routing from synthesis node', {
    enableGuardrails: state.input.settings?.enableGuardrails,
    hasError: !!state.error
  });

  if (state.error) {
    return 'responseFormatter';
  }

  if (state.input.settings?.enableGuardrails !== false) {
    return 'guardrail';
  }

  return 'responseFormatter';
}

/**
 * Conditional edge after LLM processing
 * Routes to guardrails if enabled, otherwise to formatting
 */
export function llmRouter(state: GraphStateType): string {
  logger.debug('Routing from LLM node', {
    enableGuardrails: state.input.settings?.enableGuardrails,
    hasError: !!state.error
  });

  if (state.error) {
    return 'responseFormatter';
  }

  if (state.input.settings?.enableGuardrails !== false) {
    return 'guardrail';
  }

  return 'responseFormatter';
}

/**
 * Conditional edge after guardrail
 * Always routes to response formatter but logs violations
 */
export function guardrailRouter(state: GraphStateType): string {
  logger.debug('Routing from guardrail node', {
    passed: state.guardrailResult?.passed,
    violations: state.guardrailResult?.violations
  });

  // Always go to formatter, but log if there were violations
  if (!state.guardrailResult?.passed) {
    logger.warn('Guardrail violations detected', {
      violations: state.guardrailResult?.violations,
      severity: state.guardrailResult?.severity
    });
  }

  return 'responseFormatter';
}
