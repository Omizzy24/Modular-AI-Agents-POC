import { StateGraph, END, START } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import { GraphState, GraphStateType } from './state';
import { inputValidatorNode } from './nodes/inputValidator';
import { researchNode } from './nodes/researchNode';
import { synthesisNode } from './nodes/synthesisNode';
import { guardrailNode } from './nodes/guardrail';
import { responseFormatterNode } from './nodes/responseFormatter';
import { validationRouter, researchRouter, synthesisRouter, guardrailRouter } from './edges/conditional';
import { createLogger } from '@poc/shared';
import { createTracingHandler, initializeLangSmith } from '../observability/langsmith';

const logger = createLogger('agent:graphBuilder');

/**
 * Build the LangGraph agent with new research flow
 * Flow: inputValidator → researchNode → synthesisNode → guardrail → responseFormatter
 */
export function buildAgentGraph() {
  logger.info('Building agent graph with research flow');

  // Create the graph with our state annotation
  const workflow = new StateGraph(GraphState)
    // Add all nodes
    .addNode('inputValidator', inputValidatorNode)
    .addNode('researchNode', researchNode)
    .addNode('synthesisNode', synthesisNode)
    .addNode('guardrail', guardrailNode)
    .addNode('responseFormatter', responseFormatterNode)
    // Set entry point
    .addEdge(START, 'inputValidator')
    // Add conditional edges
    .addConditionalEdges('inputValidator', validationRouter as any)
    .addConditionalEdges('researchNode', researchRouter as any)
    .addConditionalEdges('synthesisNode', synthesisRouter as any)
    .addConditionalEdges('guardrail', guardrailRouter as any)
    // Response formatter always ends
    .addEdge('responseFormatter', END);

  // Compile the graph
  const compiledGraph = workflow.compile();

  logger.info('Agent graph built successfully with research flow');
  return compiledGraph;
}

/**
 * Execute the agent graph with input and optional tools
 * Tools are injected when running from Temporal bridge
 */
export async function executeAgent(
  input: GraphStateType['input'],
  config?: RunnableConfig,
  tools?: any[]
) {
  logger.info('Executing agent graph', {
    userId: input.userId,
    hasTools: !!tools && tools.length > 0,
    toolCount: tools?.length || 0
  });

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
      timestamp: new Date().toISOString(),
      hasTools: !!tools
    },
    tags: ['poc', 'agent-execution', 'gemini', 'hybrid-architecture']
  };

  const graph = buildAgentGraph();

  // Initialize state
  const initialState: Partial<GraphStateType> = {
    input,
    tools: tools || [], // Inject tools into state
    metadata: {
      startTime: Date.now(),
      nodeExecutions: []
    }
  };

  try {
    // Execute the graph with tracing
    const result = await graph.invoke(initialState, runConfig);

    logger.info('Agent execution completed', {
      success: result.formattedResponse?.success,
      processingTime: result.formattedResponse?.metadata?.processingTime,
      tracingEnabled: !!tracingHandler,
      toolsUsed: tools?.length || 0
    });

    return result;
  } catch (error) {
    logger.error('Agent execution failed', { error });
    throw error;
  }
}
