import { StateGraph, END, START } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import { GraphState, GraphStateType } from './state';
import { inputValidatorNode } from './nodes/inputValidator';
import { llmProcessorNode } from './nodes/llmProcessor';
import { guardrailNode } from './nodes/guardrail';
import { responseFormatterNode } from './nodes/responseFormatter';
import { validationRouter, llmRouter, guardrailRouter } from './edges/conditional';
import { createLogger } from '@poc/shared';
import { createTracingHandler, initializeLangSmith } from '../observability/langsmith';

const logger = createLogger('agent:graphBuilder');

/**
 * Build the LangGraph agent
 * Constructs the stateful graph with nodes and conditional edges
 */
export function buildAgentGraph() {
  logger.info('Building agent graph');

  // Create the graph with our state annotation
  const workflow = new StateGraph(GraphState)
    // Add nodes
    .addNode('inputValidator', inputValidatorNode)
    .addNode('llmProcessor', llmProcessorNode)
    .addNode('guardrail', guardrailNode)
    .addNode('responseFormatter', responseFormatterNode)
    // Set entry point
    .addEdge(START, 'inputValidator')
    // Add conditional edges with routing functions
    .addConditionalEdges('inputValidator', validationRouter as any)
    .addConditionalEdges('llmProcessor', llmRouter as any)
    .addConditionalEdges('guardrail', guardrailRouter as any)
    // Response formatter always ends
    .addEdge('responseFormatter', END);

  // Compile the graph
  const compiledGraph = workflow.compile();

  logger.info('Agent graph built successfully');
  return compiledGraph;
}

/**
 * Execute the agent graph with input and optional tracing
 */
export async function executeAgent(
  input: GraphStateType['input'],
  config?: RunnableConfig
) {
  logger.info('Executing agent graph with tracing', { userId: input.userId });

  // Initialize LangSmith
  const langsmithClient = initializeLangSmith();

  // Create tracing handler
  const tracingHandler = createTracingHandler(`agent-${Date.now()}`);

  // Merge config with tracing
  const runConfig: RunnableConfig = {
    ...config,
    callbacks: tracingHandler ? [tracingHandler] : undefined,
    metadata: {
      userId: input.userId,
      enableGuardrails: input.settings?.enableGuardrails,
      timestamp: new Date().toISOString()
    },
    tags: ['poc', 'agent-execution', 'gemini']
  };

  const graph = buildAgentGraph();

  // Initialize state
  const initialState: Partial<GraphStateType> = {
    input,
    metadata: {
      startTime: Date.now(),
      nodeExecutions: []
    }
  };

  try {
    // Execute the graph with tracing
    const result = await graph.invoke(initialState, runConfig);

    logger.info('Agent execution completed with tracing', {
      success: result.formattedResponse?.success,
      processingTime: result.formattedResponse?.metadata?.processingTime,
      tracingEnabled: !!tracingHandler
    });

    return result;
  } catch (error) {
    logger.error('Agent execution failed', { error });
    throw error;
  }
}
