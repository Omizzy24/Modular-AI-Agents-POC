import { Annotation } from '@langchain/langgraph';
import { AgentState } from '@poc/shared';

/**
 * LangGraph state annotation
 * Defines the state shape and reducers for the agent graph
 */
export const GraphState = Annotation.Root({
  input: Annotation<AgentState['input']>(),
  validationResult: Annotation<AgentState['validationResult']>(),

  // NEW: Research results from tool calls
  researchResults: Annotation<any>(),

  llmResponse: Annotation<AgentState['llmResponse']>(),
  guardrailResult: Annotation<AgentState['guardrailResult']>(),
  formattedResponse: Annotation<AgentState['formattedResponse']>(),
  error: Annotation<string | undefined>(),

  // NEW: Tools injected by Temporal bridge
  tools: Annotation<any[]>(),

  metadata: Annotation<AgentState['metadata']>({
    reducer: (current, update) => ({
      ...current,
      ...update,
      nodeExecutions: [
        ...(current?.nodeExecutions || []),
        ...(update?.nodeExecutions || [])
      ]
    })
  })
});

export type GraphStateType = typeof GraphState.State;
