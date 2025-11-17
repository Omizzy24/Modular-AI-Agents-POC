import { AgentInput, FormattedResponse } from './agent';

/**
 * Temporal workflow types
 */
export interface WorkflowInput {
  requestId: string;
  agentInput: AgentInput;
  timestamp: number;
}

export interface WorkflowOutput {
  requestId: string;
  result: FormattedResponse;
  executionTime: number;
  workflowId: string;
}

export interface ActivityResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
