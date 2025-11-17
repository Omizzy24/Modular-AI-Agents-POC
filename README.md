# Production-Ready AI Orchestration: LangGraph + Temporal

> **A hybrid two-layer architecture for building reliable, scalable AI agents**
>
> Presented at **JS Nation US 2025**

## Overview

Most AI tutorials show you how to call `openai.chat()` - but production AI systems need durability, retries, observability, safety guardrails, and the ability to scale from 1 to 10,000+ requests per hour.

This repository demonstrates a **production-ready hybrid architecture** that combines:

- **LangGraph** for intelligent agent orchestration (cycles, conditional routing, tool binding)
- **Temporal.io** for durable workflow execution (automatic retries, crash recovery, observability)

**The Result**: AI agents that can iterate and reason like LangGraph allows, with the durability and reliability that production systems demand.

## The Hybrid Two-Layer Pattern

Traditional approaches force you to choose between flexibility and reliability:

- **Pure LangGraph**: Intelligent but fragile (no durability, crashes lose all state)
- **Traditional Temporal**: Reliable but rigid (each node as activity loses LangGraph's cycles and tool binding)

**Our Hybrid Solution**:

```
LAYER 1: Session-Level Durability (Temporal)
- One workflow per user request
- Single activity wrapping entire LangGraph
- Provides crash recovery and observability

LAYER 2: Action-Level Durability (Temporal)
- Each tool invocation spawns a child workflow
- Tools are durable and retryable
- Hierarchical observability (parent � child workflows)

Result: Full LangGraph power + Enterprise reliability
```

### Key Benefits

- **Agentic Workflows**: LangGraph supports cycles, conditional routing, and LLM-driven tool selection
- **Durable Execution**: Workflows survive crashes and automatically retry with Temporal
- **Tool Invocation**: LLM autonomously calls tools (stats verification, odds calculation, web search)
- **Child Workflows**: Each tool invocation spawns a durable child workflow for action-level reliability
- **Production Ready**: Rate limiting, guardrails, validation, error handling, observability
- **Cost Effective**: Uses Gemini Flash (80% cheaper than GPT-4), ~$0.01 per request
- **Type Safe**: End-to-end TypeScript with Zod validation
- **Observable**: Temporal UI + LangSmith tracing for complete visibility
- **Scalable**: Horizontal scaling from 2 to 50+ workers

 **Real Search Integration**: Tavily API provides real-time web search and sports data

> **Note**: This POC uses real external APIs (Tavily for search, Gemini for LLM). All architecture patterns are production-ready and demonstrate actual external API integration with durability and error handling.

## Quick Start

### Prerequisites

- Node.js 20.x
- Docker & Docker Compose
- npm 9.x or higher

### Setup & Run

```bash
# 1. Clone the repository
git clone <repository-url>
cd js_nation_us_2025

# 2. Navigate to POC directory
cd poc

# 3. Run setup script
./scripts/setup.sh

# 4. Configure API Keys (REQUIRED)
# Get Gemini API key from: https://makersuite.google.com/app/apikey
# Get Tavily API key from: https://tavily.com
# Edit .env and set:
#   GOOGLE_API_KEY=your_gemini_api_key_here
#   TAVILY_API_KEY=your_tavily_api_key_here

# 5. Start all services (6 Docker containers)
docker-compose up -d

# 6. Verify services are running
docker-compose ps

# 7. Check health
curl http://localhost:3000/health | jq .
```

### Test the System

**Example 1: Stats Verification with Tool Invocation**

This demonstrates the hybrid architecture - the LLM calls the `verify_stats` tool **twice** (once per claim), spawning two durable child workflows:

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

1. BFF validates request � Creates Temporal workflow
2. Workflow executes LangGraph with tool binding
3. LLM analyzes query � Decides to call `verify_stats` tool twice
4. Each tool call spawns `StatsVerificationWorkflow` child workflow
5. Results aggregated with 90% confidence + sources
6. Check <http://localhost:8080> to see parent workflow + 2 child workflows!

**Example 2: Odds Calculation**

```bash
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the odds that the Miami Hurricanes make the CFB playoff this season?",
    "userId": "test-user"
  }' | jq .
```

Returns probability (70%), confidence (78%), factors + automatic gambling disclaimer.

### Run E2E Tests

```bash
cd poc
./scripts/test-e2e.sh
```

Tests include: BFF health check, Temporal UI accessibility, tool invocation, validation, and guardrails.

## Technology Stack

- **LangGraph** - Intelligent agent orchestration with cycles and tool binding
- **Google Gemini** - Cost-effective LLM (gemini-2.5-flash, 80% cheaper than GPT-4)
- **Temporal.io** - Two-layer durable workflow orchestration
- **Tavily** - Real-time web search and data retrieval API
- **Express/Node.js** - Production-ready BFF API layer
- **LangSmith** - Optional LLM observability and tracing
- **Docker Compose** - Local development environment
- **TypeScript** - End-to-end type safety
- **PostgreSQL** - Workflow state persistence
- **Zod** - Runtime type validation


## Monitoring & Observability

### Temporal UI

- **URL**: <http://localhost:8080>
- View workflow executions and timeline
- Inspect parent-child workflow hierarchy
- See activity input/output and retry history
- Complete audit trail for all AI decisions

### LangSmith (Optional)

- **URL**: <https://smith.langchain.com>
- Trace every LLM call with prompts and responses
- Performance metrics and debugging
- Requires `LANGCHAIN_API_KEY` in `.env`

### Application Logs

- Structured JSON logging
- Correlation IDs for request tracing
- Log levels: debug, info, warn, error

## Documentation

- **`poc/README.md`** - Detailed technical documentation and API reference
- **`poc/images/`** - 14 comprehensive architecture diagrams (Mermaid format)
- **`poc/aidocs/ARCHITECTURE.md`** - Deep technical architecture documentation
- **`poc/aidocs/TESTING_GUIDE.md`** - Testing approaches and verification

## Common Issues & Troubleshooting

**Services won't start**:

```bash
docker-compose logs
docker-compose down && docker-compose up -d
```

**Temporal connection failed**:

- Ensure Docker services running: `docker-compose ps`
- Wait for Temporal health check to pass
- Check `TEMPORAL_ADDRESS` in `.env`

**API Configuration**:

- **Gemini**: Get key from <https://makersuite.google.com/app/apikey>
- **Tavily**: Get key from <https://tavily.com>
- Set in `.env`:
  - `GOOGLE_API_KEY=your_gemini_key_here`
  - `TAVILY_API_KEY=your_tavily_key_here`
- Verify connection: `curl http://localhost:3000/health | jq .`
- Rebuild workers if .env changed: `docker-compose build temporal-worker && docker-compose restart temporal-worker`

## Contributing

This is a demonstration POC for educational purposes. Feel free to:

- Open issues for questions or bugs
- Submit PRs for improvements
- Use as a reference for your own projects
- Adapt the patterns for your use cases

## References

- [LangGraph Documentation](https://github.com/langchain-ai/langgraphjs) - Stateful agent orchestration
- [Temporal Documentation](https://docs.temporal.io) - Durable workflow platform
- [Google Gemini API](https://ai.google.dev/docs) - Cost-effective LLM API
- [Tavily API](https://tavily.com) - Real-time web search and data retrieval
- [LangSmith Documentation](https://docs.smith.langchain.com) - LLM observability
- [Express Documentation](https://expressjs.com) - Node.js web framework

## Acknowledgments

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

**Presented at JS Nation US 2025** | [Detailed Documentation](poc/README.md) | [Architecture Deep Dive](poc/aidocs/ARCHITECTURE.md)
