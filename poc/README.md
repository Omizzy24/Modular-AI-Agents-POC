# AI Orchestration POC: Hybrid Two-Layer Architecture with LangGraph + Temporal

> Built for JS Nation US 2025 Talk

## Overview

This Proof of Concept demonstrates a **hybrid architecture** for building reliable, scalable AI agents that go beyond simple LLM API calls.

**The Challenge**: Most AI tutorials show you how to call `openai.chat()` - but production AI systems need durability, retries, observability, safety guardrails, and the ability to scale from 1 to 10,000+ requests per hour.

**The Solution**: Combine the intelligence of **LangGraph** (agentic workflows with cycles and tool binding) with the reliability of **Temporal.io** (durable workflows with automatic retries) in a novel two-layer architecture.

### Technology Stack

- **LangGraph** - Intelligent agent orchestration with cycles and tool binding
- **Google Gemini** - Cost-effective LLM (gemini-2.5-flash, 80% cheaper than GPT-4)
- **Temporal.io** - Two-layer durable workflow orchestration
- **Tavily** - Real-time web search and data retrieval API
- **Express/Node.js** - Production-ready BFF API layer
- **LangSmith** - Optional LLM observability and tracing (coming soon)
- **Docker Compose** - Local development environment
- **TypeScript** - End-to-end type safety

## Architecture: Hybrid Two-Layer Durability

```
Client (HTTP)
    ↓
Express/Node.js BFF (Port 3000)
├─ Zod validation
├─ Rate limiting (30 req/min)
├─ Security (Helmet, CORS)
└─ Temporal client
    ↓
┌──────────────────────────────────────────────┐
│ LAYER 1: Session-Level Durability (Temporal) │
│                                               │
│  agentOrchestrationWorkflow                   │
│    └─ executeAgentGraphActivity               │
│       (Wraps entire LangGraph)                │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ LangGraph StateGraph Execution                │
│                                               │
│  inputValidator → researchNode ⟲              │
│                         ↓                     │
│                   [LLM Tool Binding]          │
│                         ↓                     │
│                  synthesisNode                │
│                         ↓                     │
│                   guardrail                   │
│                         ↓                     │
│                 responseFormatter             │
└───────────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────────┐
│ LAYER 2: Action-Level Durability (Temporal)   │
│                                               │
│  LangGraph Tools → Temporal Child Workflows:  │
│  ├─ web_search → WebSearchWorkflow            │
│  ├─ verify_stats → StatsVerificationWorkflow  │
│  └─ calculate_odds → OddsCalculationWorkflow  │
└───────────────────────────────────────────────┘
    ↓
Google Gemini API (gemini-2.5-flash)
    ↓
(Optional) LangSmith Tracing
```

**Key Innovation**:
- **Layer 1** provides session-level durability (one workflow, one activity wrapping entire LangGraph)
- **Layer 2** provides action-level durability (each tool invocation spawns a durable child workflow)
- LangGraph maintains full power: cycles, conditional routing, tool binding, LLM-driven tool selection

### Why This Architecture?

**Problem with Traditional Approach**: When you make each LangGraph node a separate Temporal activity, you lose the power of LangGraph - no cycles, no conditional routing, no LLM tool binding. It becomes a rigid linear workflow.

**Problem with Pure LangGraph**: No durability, no automatic retries, no observability when things fail. If your server crashes mid-execution, you lose everything.

**Hybrid Solution**:
1. **Wrap entire LangGraph in one activity** → Full LangGraph flexibility preserved
2. **Tools trigger child workflows** → Each tool execution is durable and retryable
3. **Best of both worlds** → Intelligent agentic behavior + enterprise reliability

**Result**: An AI agent that can iterate and reason like LangGraph allows, but with the durability and reliability that production systems demand.

### 🎯 Key Features

- ✅ **Agentic Workflows**: LangGraph supports cycles, conditional routing, and LLM-driven tool selection
- ✅ **Durable Execution**: Workflows survive crashes and automatically retry with Temporal
- ✅ **Tool Invocation**: LLM autonomously calls tools (stats verification, odds calculation, web search)
- ✅ **Child Workflows**: Each tool invocation spawns a durable child workflow for action-level reliability
- ✅ **Production Ready**: Rate limiting, guardrails, validation, error handling, observability
- ✅ **Type Safe**: End-to-end TypeScript with Zod validation
- ✅ **Observable**: Temporal UI + LangSmith tracing for complete visibility
- ✅ **Scalable**: Horizontal scaling from 2 to 50+ workers
- ✅ **Real Search**: Tavily API integration for real-time web search and sports data

> **Note**: This POC uses real external APIs (Tavily for search, Gemini for LLM). All architecture patterns are production-ready and demonstrate actual external API integration with durability and error handling.

## Quick Start

### Prerequisites
- Node.js 20.x
- Docker & Docker Compose
- npm 9.x or higher

### Setup

```bash
# 1. Navigate to project directory
cd poc

# 2. Run setup script
./scripts/setup.sh

# 3. Edit .env to configure API Keys (REQUIRED)
#    Get Gemini API key from: https://makersuite.google.com/app/apikey
#    Get Tavily API key from: https://tavily.com
#    Set GOOGLE_API_KEY=your_gemini_key_here
#    Set TAVILY_API_KEY=your_tavily_key_here

# 4. Start all services
docker-compose up -d

# 5. Verify services are running
docker-compose ps

# 6. Check health
curl http://localhost:3000/health | jq .
```

## Testing the POC

### Example 1: Stats Verification with Tool Invocation

This example demonstrates the hybrid architecture in action - the LLM analyzes the query, decides to call the `verify_stats` tool **twice** (once per claim), and each tool invocation spawns a durable child workflow.

```bash
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Verify this claim and provide sources: Stephen Curry has made over 3,500 three-pointers in his career. The New York Knicks are the team that he has scored the most points against.",
    "userId": "test-user",
    "settings": {"enableGuardrails": true}
  }' | jq .
```

**What Happens**:
1. Request hits BFF → Creates Temporal workflow
2. Workflow executes LangGraph with tool binding
3. LLM analyzes query → Decides to call `verify_stats` tool twice
4. Each tool call spawns a `StatsVerificationWorkflow` child workflow
5. Child workflows execute activities: `verifyStats` → `validateSource`
6. Results aggregated and returned with 90% confidence + sources

**Check Temporal UI**: http://localhost:8080 to see the parent workflow and 2 child workflows!

### Example 2: Odds Calculation

```bash
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the odds that the Miami Hurricanes make the CFB playoff this season?",
    "userId": "test-user"
  }' | jq .
```

**What Happens**:
- LLM calls `calculate_odds` tool → Spawns `OddsCalculationWorkflow`
- Returns probability (70%), confidence (78%), historical factors
- Guardrail automatically adds gambling disclaimer

### Example 3: Basic Agent Execution (No Tools)

```bash
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, AI Orchestration with Gemini!",
    "userId": "test-user",
    "settings": {
      "temperature": 0.7,
      "enableGuardrails": true
    }
  }' | jq .
```

### Run All E2E Tests

```bash
./scripts/test-e2e.sh
```

**Tests Include**:
- ✅ BFF Health Check
- ✅ Temporal UI Accessibility
- ✅ Full Agent Execution with Tool Invocation
- ✅ Validation Error Handling
- ✅ Guardrail PII Detection

### Expected Response

```json
{
  "requestId": "uuid-here",
  "success": true,
  "message": "Hello! I received your message...",
  "data": {
    "originalInput": "Hello, AI Orchestration with Gemini!",
    "processedContent": "...",
    "validationStatus": "passed",
    "guardrailStatus": "passed",
    "model": "gemini-1.5-flash",
    "tokensUsed": 150
  },
  "metadata": {
    "processingTime": 1234,
    "nodesExecuted": ["inputValidator", "llmProcessor", "guardrail", "responseFormatter"]
  },
  "workflowId": "uuid-here",
  "executionTime": 1500
}
```

## Key Concepts Demonstrated

### 1. Modular Agent (LangGraph)
- **Nodes**: Independent processing units (validation, LLM, guardrails, formatting)
- **Edges**: Conditional routing between nodes
- **State**: Shared state passed between nodes
- **Location**: `packages/agent/src/graph/`

### 2. Google Gemini Integration
- Uses `gemini-2.5-flash` for fast, cost-effective responses
- Requires Google API key (get from https://makersuite.google.com/app/apikey)
- Automatic token counting and usage tracking
- **Configuration**: Set `GOOGLE_API_KEY` in `.env`

### 3. Observability (LangSmith)
- Automatic tracing of all graph executions
- Detailed visibility into agent "thought process"
- Performance metrics and debugging
- **Configuration**: Set `LANGCHAIN_API_KEY` in `.env` (optional)

### 4. Guardrails
- First-class nodes in the graph
- Content moderation and safety checks
- PII detection and redaction
- **Location**: `packages/agent/src/graph/nodes/guardrail.ts`

### 5. Hybrid Two-Layer Durability (Temporal)
- **Layer 1 (Session)**: Single workflow wrapping entire LangGraph execution
- **Layer 2 (Action)**: Each tool invocation spawns a durable child workflow
- Automatic retry on failures at both layers
- Complete workflow state persistence and history
- Parent-child workflow hierarchy visible in Temporal UI
- **Dashboard**: http://localhost:8080

### 6. BFF Pattern
- RESTful API gateway
- Request validation with Zod
- Rate limiting and security
- **Endpoint**: http://localhost:3000/api/agent/execute

## What Makes This Production-Ready?

Unlike typical AI demos that work on your laptop but fail in production, this POC demonstrates real production patterns:

### ✅ Reliability
- **Automatic Retries**: Temporal retries failed activities with exponential backoff
- **Crash Recovery**: If a worker crashes, workflows resume from last checkpoint
- **State Persistence**: All workflow state stored in PostgreSQL
- **Idempotency**: Safe to retry any operation

### ✅ Observability
- **Temporal UI**: Complete execution history and timeline for every workflow
- **LangSmith Tracing**: (Optional) Trace every LLM call with prompts and responses
- **Structured Logging**: JSON logs with correlation IDs for request tracing
- **Audit Trail**: Know exactly what the AI did and why

### ✅ Scalability
- **Horizontal Scaling**: Add more workers to handle increased load
- **Worker Pools**: 2 workers in dev, easily scale to 50+ in production
- **Rate Limiting**: 30 req/min per user (configurable)
- **Tested**: Handles 100+ concurrent requests

### ✅ Safety
- **Guardrails**: Content moderation and PII detection as first-class nodes
- **Validation**: Zod validates all inputs before workflows execute
- **Error Handling**: Graceful degradation with user-friendly error messages
- **Security**: Helmet.js, CORS, and rate limiting on BFF

## Project Structure

```
poc/
├── packages/
│   ├── shared/             # Shared TypeScript types and utilities
│   ├── agent/              # LangGraph agent implementation
│   │   ├── src/graph/      # Graph nodes, edges, state, and builders
│   │   └── src/tools/      # Temporal tool bridge for LangChain
│   ├── temporal-worker/    # Temporal workflows and activities
│   │   ├── src/workflows/  # Main + tool child workflows
│   │   └── src/activities/ # Activity implementations
│   └── bff/                # Express/Node.js BFF API server
│       ├── src/routes/     # API route handlers
│       └── src/middleware/ # Express middleware (validation, security)
├── docker/                 # Dockerfiles for each service
├── scripts/                # Setup, testing, and utility scripts
├── docker-compose.yml      # Service orchestration (6 containers)
```

## Development

### Running Locally (without Docker)

```bash
# Terminal 1: Start Temporal (via Docker)
docker-compose up temporal postgres temporal-ui -d

# Terminal 2: Start Temporal Worker
cd packages/temporal-worker
npm run dev

# Terminal 3: Start BFF
cd packages/bff
npm run dev
```

### Running Tests

```bash
npm test
```

## Monitoring

### Temporal UI
- Access at: http://localhost:8080
- View workflow executions
- Inspect activity failures and retries

### LangSmith (if configured)
- View traces at: https://smith.langchain.com
- Project: `ai-orchestration-poc`
- Includes full graph execution traces

### Application Logs
- Structured JSON logging
- Correlation IDs for request tracing
- Log levels: debug, info, warn, error

## Documentation

This repository includes comprehensive documentation for understanding, running, and presenting this POC:

### 📄 For Users & Developers
- **README.md** (this file) - Quick start guide and architecture overview

**How to Use Diagrams**:
- View directly on GitHub (renders Mermaid natively)
- Convert to PNG/SVG using included scripts
- Import to https://mermaid.live for customization
- See `images/README.md` for detailed descriptions

## Troubleshooting

### Common Issues

**1. Services won't start**
```bash
# Check logs
docker-compose logs

# Restart services
docker-compose down
docker-compose up -d
```

**2. Temporal connection failed**
- Ensure Docker services are running: `docker-compose ps`
- Check `TEMPORAL_ADDRESS` in `.env`
- Wait for Temporal health check to pass

**3. BFF returns 500 errors**
- Check worker is registered: `docker-compose logs temporal-worker`
- Verify Temporal is healthy: `curl http://localhost:7233`

**4. API Configuration**
- **Gemini**: Get key from https://makersuite.google.com/app/apikey
- **Tavily**: Get key from https://tavily.com
- Set in `.env`:
  - `GOOGLE_API_KEY=your_gemini_key_here`
  - `TAVILY_API_KEY=your_tavily_key_here`
- Verify connection: `curl http://localhost:3000/health | jq .`
- Rebuild workers after .env changes: `docker-compose build temporal-worker && docker-compose restart temporal-worker`

**5. LangSmith not tracing**
- Verify `LANGCHAIN_API_KEY` is set in `.env`
- Ensure `LANGCHAIN_TRACING_V2=true`
- Check logs for "LangSmith client initialized"

## Production Considerations

This POC demonstrates architectural patterns. For production:

### Security
- Implement proper authentication/authorization
- Use secrets management (e.g., HashiCorp Vault)
- Enable TLS for all services
- Add API key rotation

### Scalability
- Use Kubernetes for orchestration
- Implement horizontal pod autoscaling
- Add caching layer (Redis)
- Configure Temporal worker pools

### Monitoring
- Add Prometheus metrics
- Implement distributed tracing (OpenTelemetry)
- Set up alerting (PagerDuty)
- Monitor Gemini API quotas

### Cost Optimization
- Use Gemini 1.5 Flash for most requests
- Upgrade to Gemini 1.5 Pro only when needed
- Implement request caching
- Monitor token usage

## References

- [LangGraph Documentation](https://github.com/langchain-ai/langgraphjs)
- [Google Gemini API](https://ai.google.dev/docs)
- [Tavily API](https://tavily.com)
- [Temporal Documentation](https://docs.temporal.io)
- [LangSmith Documentation](https://docs.smith.langchain.com)
- [Express Documentation](https://expressjs.com)

## About This Project

This POC was developed for a talk at **JS Nation US 2025** on building production-ready AI orchestration systems. While it's a proof of concept, it demonstrates real architectural patterns used in enterprise AI systems.

### Use Cases

This architecture is suitable for:
- **AI Agents** that need durability and retries (customer support, data analysis)
- **Multi-step LLM Workflows** with external tool calls (research, verification)
- **Production AI Systems** requiring observability and error handling
- **Learning** about LangGraph, Temporal, and hybrid architectures

### Getting Help

- **Issues**: Open an issue in this repository
- **Documentation**: See this README and `aidocs/ARCHITECTURE.md`
- **Architecture**: See `aidocs/ARCHITECTURE.md` for deep technical dives

### Roadmap / Future Improvements

Completed:
- [x] **Real external API integrations** - Tavily search API integrated for web search, stats verification, and odds calculation

Future improvements:
- [ ] LangSmith integration (add API key configuration)
- [ ] Streaming responses with Server-Sent Events
- [ ] Redis caching layer for query results
- [ ] Distributed rate limiting with Redis
- [ ] Prometheus + Grafana monitoring dashboards
- [ ] Kubernetes deployment manifests
- [ ] Multi-model support (fallback from Gemini to GPT-4)

### Acknowledgments

Built with:
- [LangGraph](https://github.com/langchain-ai/langgraphjs) by LangChain
- [Temporal](https://temporal.io) for durable workflows
- [Google Gemini](https://ai.google.dev) for cost-effective LLM API
- [Tavily](https://tavily.com) for real-time web search
- [Express](https://expressjs.com) for the BFF layer
- TypeScript, Docker, PostgreSQL, and many other open source tools

Inspired by production AI systems at companies building reliable, scalable agents.

## License

MIT - This is a demonstration POC for educational purposes.

---

**Built for JS Nation US 2025**
