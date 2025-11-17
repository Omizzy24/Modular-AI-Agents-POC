import { z } from 'zod';

/**
 * Input schema for agent requests
 * Validates incoming data structure for the AI agent
 */
export const AgentInputSchema = z.object({
  message: z.string().min(1).max(1000),
  userId: z.string().optional(),
  context: z.record(z.any()).optional(),
  settings: z.object({
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().min(1).max(8000).default(500),
    enableGuardrails: z.boolean().default(true),
  }).optional(),
});

export type AgentInput = z.infer<typeof AgentInputSchema>;

/**
 * Agent graph state definition
 * Represents the state passed between nodes in the LangGraph
 */
export interface AgentState {
  input: AgentInput;
  validationResult?: ValidationResult;
  llmResponse?: LLMResponse;
  guardrailResult?: GuardrailResult;
  formattedResponse?: FormattedResponse;
  error?: string;
  metadata: {
    startTime: number;
    nodeExecutions: NodeExecution[];
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  sanitizedInput?: string;
  queryType?: 'facts' | 'analysis' | 'odds';  // Sports-specific query classification
}

export interface LLMResponse {
  content: string;
  model: string;
  tokensUsed: number;
  timestamp: number;
}

export interface GuardrailResult {
  passed: boolean;
  violations?: string[];
  severity?: 'low' | 'medium' | 'high';
  modifiedContent?: string;
}

export interface FormattedResponse {
  success: boolean;
  message: string;
  data?: any;
  metadata?: {
    processingTime: number;
    nodesExecuted: string[];
  };
}

export interface NodeExecution {
  nodeName: string;
  startTime: number;
  endTime: number;
  status: 'success' | 'failure' | 'skipped';
  error?: string;
}
