# JS Nation US 2025 - Talk Preparation Guide
## Full-Stack AI Orchestration with LangGraph + Temporal.io

---

## 📋 Quick Reference

**Talk Duration**: 20-30 minutes (adjust based on slot)
**Target Audience**: JavaScript/TypeScript developers interested in AI engineering
**Tech Stack**: LangGraph, Google Gemini, Temporal.io, Express, Docker
**Demo URL**: http://localhost:3000 (when running)
**Temporal UI**: http://localhost:8080

---

## 🎯 Core Message

**"Building Production-Ready AI Applications Requires More Than Just LLMs"**

This POC demonstrates how to transform a simple LangGraph agent into an enterprise-grade, durable AI workflow using Temporal.io, showing the architectural patterns needed for real-world AI applications.

---

## 📊 Architecture Overview (Visual for Slides)

### The Complete Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                              │
│  Browser/CLI → HTTP POST /api/agent/execute                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    BFF LAYER (Express)                       │
│  • Request validation (Zod)                                  │
│  • Rate limiting (30 req/min)                                │
│  • Security (Helmet, CORS)                                   │
│  • Workflow orchestration kickoff                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              ORCHESTRATION LAYER (Temporal)                  │
│  • Durable workflow execution                                │
│  • Automatic retries (exponential backoff)                   │
│  • State persistence (PostgreSQL)                            │
│  • Horizontal scaling (2 workers)                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  AGENT LAYER (LangGraph)                     │
│                                                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Input     │───▶│     LLM     │───▶│ Guardrails  │     │
│  │ Validation  │    │  Processor  │    │   Safety    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                    │            │
│         └──────────────────┼────────────────────┘            │
│                            ▼                                  │
│                   ┌─────────────┐                            │
│                   │  Response   │                            │
│                   │  Formatter  │                            │
│                   └─────────────┘                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Google Gemini│
                  │   (LLM API)  │
                  └──────────────┘
```

### Data Flow (Step by Step)

```
1. Client Request
   ↓
2. BFF Validation (Zod schema)
   ↓
3. Temporal Workflow Creation (with unique ID)
   ↓
4. Worker Polls Task Queue
   ↓
5. Activity 1: Input Validation
   - Sanitize input
   - Classify query type (facts/analysis/odds)
   - Set temperature based on type
   ↓
6. Activity 2: LLM Processing (if validation passed)
   - Call Google Gemini API
   - Track token usage
   - Handle errors with retry
   ↓
7. Activity 3: Guardrails (if enabled)
   - PII detection & redaction
   - Content filtering
   - Add disclaimers (gambling queries)
   ↓
8. Activity 4: Response Formatting
   - Aggregate metadata
   - Calculate processing time
   - Structure final response
   ↓
9. Workflow Completes
   ↓
10. BFF Returns Response (with workflow ID)
```

---

## 🔑 Key Concepts to Explain

### 1. **Why LangGraph?**

**The Problem**: Traditional LLM apps are linear chains:
```
Input → Prompt → LLM → Output
```

**LangGraph Solution**: Modular, stateful graphs with conditional routing:
```
Input → [Validate] → [LLM] → [Guardrails] → [Format] → Output
           ↓           ↓          ↓
        [fail]    [success]   [modified]
```

**Benefits**:
- **Modularity**: Each node is independent and testable
- **Flexibility**: Conditional routing based on state
- **Observability**: Clear visibility into each step
- **Reusability**: Nodes can be reused across agents

### 2. **Why Temporal?**

**The Problem**: What happens when your LLM API call fails after 15 seconds?
- Lost work
- No retry logic
- No state persistence
- Manual error handling

**Temporal Solution**: Each LangGraph node becomes a durable activity:
```typescript
// Before (fragile)
const result = await geminiAPI.call(input);

// After (durable)
const result = await processWithLLMActivity(input);
// ↑ Automatically retried on failure
// ↑ State persisted in database
// ↑ Survives process crashes
```

**Benefits**:
- **Durability**: Workflows survive crashes
- **Automatic Retries**: Configurable retry policies
- **Observability**: Full execution history
- **Horizontal Scaling**: Multiple workers process in parallel

### 3. **The Architecture Pattern**

**Key Insight**: LangGraph provides the "brain" (agent logic), Temporal provides the "body" (durable execution).

```
LangGraph Node          →    Temporal Activity
───────────────────          ──────────────────────
inputValidatorNode      →    validateInputActivity
llmProcessorNode        →    processWithLLMActivity
guardrailNode           →    checkGuardrailsActivity
responseFormatterNode   →    formatResponseActivity
```

This mapping creates **enterprise-grade AI workflows** from simple agents.

---

## 💡 Live Demo Flow

### Demo 1: Basic Agent Execution (2 minutes)

**Show the curl command**:
```bash
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Who won the Super Bowl in 2023?",
    "settings": {"enableGuardrails": true}
  }' | jq .
```

**Point out in response**:
- `success: true` - Workflow completed
- `model: "models/gemini-2.5-flash"` - Real Gemini API
- `processingTime: 1233` - Total time in ms
- `workflowId: "uuid"` - Temporal workflow identifier
- `response: "The Kansas City Chiefs..."` - Actual LLM response

**Talking Point**: "In one HTTP request, we've orchestrated a durable workflow with 4 activities, LLM processing, and safety guardrails."

### Demo 2: Temporal UI (3 minutes)

**Open**: http://localhost:8080

**Show**:
1. **Workflows List** - Recent executions
2. **Click on a workflow** - Show full execution history
3. **Timeline View** - Visual representation of activities
4. **Activity Details** - Input/output for each activity
5. **Retry History** - If any retries occurred

**Talking Points**:
- "Every execution is fully traceable"
- "If something fails, you can see exactly where and why"
- "This is your audit log for AI decisions"

### Demo 3: Query Classification (2 minutes)

**Run three different query types**:

```bash
# Facts Query (Temperature 0.3)
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{"message": "Who won the Super Bowl in 2023?"}' | jq .

# Analysis Query (Temperature 0.7)
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{"message": "What were the key factors in the Lakers victory?"}' | jq .

# Odds Query (Temperature 0.5 + Disclaimer)
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{"message": "What are the chances of the Warriors making the playoffs?"}' | jq .
```

**Point out**:
- Different temperatures based on query type
- Gambling disclaimer automatically added to odds queries
- Shows LangGraph's conditional routing in action

### Demo 4: Error Handling (1 minute)

**Invalid input**:
```bash
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{"message": ""}' | jq .
```

**Show**:
- Validation error caught by Zod
- Descriptive error message
- No LLM call wasted

---

## 📝 Code Snippets to Show

### Snippet 1: LangGraph Node (Simple)

```typescript
// packages/agent/src/graph/nodes/inputValidator.ts
export async function inputValidatorNode(state: GraphStateType) {
  const { message } = state.input;

  // Classify query type
  const lowerMessage = message.toLowerCase();
  let queryType: 'facts' | 'analysis' | 'odds' = 'facts';

  if (lowerMessage.match(/\b(odds|chances|probability)\b/i)) {
    queryType = 'odds';
  } else if (lowerMessage.match(/\b(analyze|why|how|factor)\b/i)) {
    queryType = 'analysis';
  }

  return {
    validationResult: { isValid: true, queryType }
  };
}
```

**Talking Point**: "Each node is just a TypeScript function with clear inputs and outputs."

### Snippet 2: Temporal Activity Wrapper

```typescript
// packages/temporal-worker/src/activities/validateInput.ts
export async function validateInputActivity(input: AgentInput) {
  const state = { input, metadata: { startTime: Date.now() } };

  // Execute the LangGraph node
  const result = await inputValidatorNode(state);

  return { success: true, data: result.validationResult };
}
```

**Talking Point**: "The activity is just a thin wrapper that makes the node durable."

### Snippet 3: Workflow Orchestration

```typescript
// packages/temporal-worker/src/workflows/agentWorkflow.ts
export async function agentWorkflow(input: WorkflowInput) {
  // Step 1: Validate
  const validationResult = await validateInputActivity(input.agentInput);

  if (validationResult.data?.isValid) {
    // Step 2: Process with LLM
    const llmResult = await processWithLLMActivity(input.agentInput);

    // Step 3: Check Guardrails
    if (input.agentInput.settings?.enableGuardrails) {
      await checkGuardrailsActivity(llmResult.data);
    }
  }

  // Step 4: Format Response
  return await formatResponseActivity(state);
}
```

**Talking Point**: "The workflow is your control flow - it survives crashes and automatically retries on failures."

### Snippet 4: Graph Builder (LangGraph)

```typescript
// packages/agent/src/graph/builder.ts
export function buildAgentGraph() {
  const workflow = new StateGraph(GraphState);

  // Add nodes
  workflow.addNode('inputValidator', inputValidatorNode);
  workflow.addNode('llmProcessor', llmProcessorNode);
  workflow.addNode('guardrail', guardrailNode);
  workflow.addNode('responseFormatter', responseFormatterNode);

  // Conditional routing
  workflow.addConditionalEdges('inputValidator', validationRouter);
  workflow.addConditionalEdges('llmProcessor', llmRouter);

  return workflow.compile();
}
```

**Talking Point**: "LangGraph lets you build complex agent logic with conditional routing and state management."

---

## 🎤 Talking Points by Section

### Introduction (2 minutes)

**Opening**: "How many of you have built an LLM application? Great! Now, how many have deployed one to production and had it run reliably for months?"

**The Problem**:
- Most AI tutorials show simple OpenAI API calls
- Production needs: retries, observability, error handling, safety
- Gap between "demo" and "production-ready"

**The Solution**:
- LangGraph for modular agent construction
- Temporal for durable execution
- This POC bridges that gap

### Part 1: LangGraph Agent (5 minutes)

**Concept**: "Let's start with the 'brain' - the agent itself"

**Show**:
1. Graph visualization (draw on slide)
2. Node implementation (code snippet)
3. Conditional routing (validation router)

**Key Point**: "Each node is independent, testable, and reusable. This is software engineering for AI."

### Part 2: Temporal Integration (7 minutes)

**Concept**: "Now let's add the 'body' - durable execution"

**Show**:
1. Activity wrapper (code snippet)
2. Workflow orchestration (code snippet)
3. Temporal UI (live demo)

**Key Points**:
- "Activities = durable, retriable units of work"
- "Workflows = your control flow that survives crashes"
- "This is what separates demos from production"

### Part 3: Full Stack Integration (5 minutes)

**Concept**: "Let's put it all together"

**Show**:
1. Architecture diagram
2. Data flow walkthrough
3. Live demo (all three query types)

**Key Point**: "From HTTP request to durable AI workflow in milliseconds."

### Part 4: Production Patterns (3 minutes)

**Horizontal Scaling**:
```bash
docker-compose ps | grep temporal-worker
# Shows 2 workers running
```

**Observability**:
- Temporal UI for workflow history
- LangSmith for LLM tracing (optional)
- Structured logging throughout

**Safety**:
- Input validation (Zod)
- Guardrails (PII detection, content filtering)
- Rate limiting (30 req/min)

**Key Point**: "These aren't afterthoughts - they're first-class citizens in the architecture."

### Conclusion (3 minutes)

**Recap**:
1. LangGraph = modular agent construction
2. Temporal = durable execution
3. Together = production-ready AI

**Call to Action**:
- "Check out the full POC on GitHub (if you publish it)"
- "Try building your own agents with these patterns"
- "Questions?"

---

## 🤔 Q&A Preparation

### Expected Questions

**Q: Why Temporal instead of just catching errors?**

A: "Great question! Try/catch handles one execution. Temporal handles:
- **Persistence**: Your workflow state survives process crashes
- **Retries**: Automatic exponential backoff across days if needed
- **History**: Full audit trail of every execution
- **Scaling**: Distribute work across multiple workers automatically

It's the difference between 'handling an error' and 'building a reliable system.'"

**Q: Isn't this overkill for a simple LLM call?**

A: "For a demo? Absolutely. For production? Not at all. Consider:
- What if Gemini API goes down for 2 minutes?
- What if your process crashes during execution?
- What if you need to process 10,000 requests/hour?
- How do you debug failures that happened 3 days ago?

Temporal answers all of these out of the box."

**Q: Does this work with OpenAI instead of Gemini?**

A: "Yes! Just swap the LLM in `llmProcessorNode`:
```typescript
// Change this
const llm = new ChatGoogleGenerativeAI({ modelName: 'gemini-1.5-flash' });

// To this
const llm = new ChatOpenAI({ modelName: 'gpt-4' });
```
That's the beauty of the abstraction - the orchestration layer doesn't care about the LLM."

**Q: How do you handle rate limits?**

A: "Multiple layers:
1. **BFF Layer**: Express rate limiting (30 req/min per IP)
2. **Temporal Retry**: Exponential backoff respects API rate limits
3. **Worker Pools**: Control concurrency by worker count
4. **Activity Timeouts**: Prevent hanging on slow APIs"

**Q: What about costs?**

A: "Smart choices:
- **Gemini 1.5 Flash**: 80% cheaper than GPT-4, similar quality
- **Token Tracking**: Every response includes token usage
- **Caching**: Add Redis for repeated queries (not in POC)
- **Guardrails**: Prevent wasted tokens on invalid input

The POC tracks costs explicitly so you can monitor."

**Q: Can you show failure handling?**

A: "Sure! (Live demo)
1. Kill a worker: `docker stop poc-temporal-worker-1`
2. Send request - still works (other worker picks it up)
3. View in Temporal UI - see automatic failover

This is horizontal scaling + fault tolerance built-in."

**Q: How does LangSmith fit in?**

A: "LangSmith is optional but powerful:
- Traces every LLM call with prompts and responses
- Helps debug prompt engineering
- Provides analytics on model usage
- Complements Temporal (which tracks workflow)

Think of it as: Temporal = system observability, LangSmith = LLM observability."

---

## 📊 Metrics to Quote

**Performance** (from test results):
- Average response time: ~1,200ms (including Gemini API call)
- Facts query: ~300ms (low temperature, fast)
- Analysis query: ~1,800ms (detailed response)
- Concurrent workers: 2 (easily scalable to 10+)

**Reliability**:
- Automatic retries: Up to 3 attempts with exponential backoff
- Workflow persistence: Survives crashes, restarts
- Zero data loss: All state in PostgreSQL

**Safety**:
- Input validation: 100% of requests
- Guardrails: PII detection, content filtering
- Rate limiting: 30 requests/minute per IP
- Gambling disclaimers: Automatically added to odds queries

---

## 🎨 Slide Suggestions

### Slide 1: Title
**Full-Stack AI Orchestration**
*Building Production-Ready AI with LangGraph + Temporal.io*

### Slide 2: The Problem
- Traditional AI: Simple API calls
- Production needs: Retries, observability, safety
- Gap between demo and production

### Slide 3: The Solution
- LangGraph: Modular agent construction
- Temporal: Durable execution
- Together: Production-ready AI

### Slide 4: Architecture (High-Level)
*Show the complete stack diagram*

### Slide 5: LangGraph Agent
*Show the graph with nodes and edges*

### Slide 6: Node Example (Code)
*Show inputValidatorNode code snippet*

### Slide 7: Temporal Integration
*Show activity wrapper pattern*

### Slide 8: Workflow Orchestration
*Show agentWorkflow code snippet*

### Slide 9: Live Demo
*Terminal + Temporal UI side-by-side*

### Slide 10: Production Patterns
- Horizontal scaling
- Observability
- Safety & guardrails

### Slide 11: Results
- Metrics (performance, reliability)
- Real-world benefits

### Slide 12: Key Takeaways
1. Modular agents (LangGraph)
2. Durable execution (Temporal)
3. Production patterns matter

### Slide 13: Resources
- GitHub repo (if published)
- Documentation links
- Contact info

---

## 🚀 Pre-Talk Checklist

### 1 Day Before
- [ ] Run full E2E test suite: `./scripts/test-e2e.sh`
- [ ] Verify all Docker containers healthy: `docker-compose ps`
- [ ] Test Temporal UI accessible: http://localhost:8080
- [ ] Prepare backup API keys (if using real Gemini)
- [ ] Screenshot key workflows in Temporal UI
- [ ] Record backup demo video (in case of connectivity issues)

### 2 Hours Before
- [ ] Start all services: `docker-compose up -d`
- [ ] Verify health endpoint: `curl http://localhost:3000/health`
- [ ] Run all three demo queries (facts, analysis, odds)
- [ ] Check Temporal UI shows recent workflows
- [ ] Increase terminal font size for visibility
- [ ] Open necessary browser tabs (Temporal UI, backup slides)
- [ ] Test screen sharing with demo

### 30 Minutes Before
- [ ] Restart services for clean state: `docker-compose restart`
- [ ] Clear Temporal workflow history (optional, for clean demo)
- [ ] Test internet connectivity
- [ ] Have backup curl commands in text file
- [ ] Check microphone and screen sharing
- [ ] Open jq in terminal (for pretty JSON output)

---

## 🎯 Success Metrics for Talk

**Engagement**:
- Audience asks questions about implementation
- Requests for repo/code access
- Questions about Temporal vs. other orchestrators

**Understanding**:
- Audience can explain LangGraph vs. Temporal roles
- Questions about specific architectural decisions
- Discussion about applying to their use cases

**Impact**:
- Increased awareness of production AI patterns
- Interest in Temporal for AI workflows
- Recognition that AI engineering ≠ just LLM calls

---

## 📚 Additional Resources to Reference

**Documentation**:
- LangGraph: https://github.com/langchain-ai/langgraphjs
- Temporal: https://docs.temporal.io
- Google Gemini: https://ai.google.dev/docs

**Related Concepts**:
- Agent frameworks: AutoGPT, LangChain, CrewAI
- Workflow orchestrators: Airflow, Prefect, Dagster
- State machines: XState, Robot

**Production AI**:
- LangSmith for LLM observability
- LangServe for LangChain deployment
- Modal/Replicate for GPU inference

---

## 🎬 Closing Thoughts

**The Big Idea**: Building production AI requires rethinking traditional software patterns. LangGraph gives us the tools to build modular agents, and Temporal gives us the infrastructure to run them reliably at scale.

**The Call to Action**: Don't treat LLMs as magic APIs. Treat them as components in a larger system that needs proper engineering, observability, and reliability.

**The Takeaway**: This POC is a blueprint for production AI. Start here, and scale to your needs.

---

**Good luck with your talk! 🚀**

*For detailed technical documentation, see:*
- `aidocs/ARCHITECTURE.md` - Complete system architecture
- `aidocs/TESTING_GUIDE.md` - Testing approaches
- `poc/README.md` - Quick start guide
