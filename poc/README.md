# AI Orchestration POC: Full-Stack Enterprise AI Architecture with Gemini

## Overview

This Proof of Concept demonstrates a comprehensive enterprise AI orchestration architecture using:
- **LangGraph** for modular agent construction
- **Google Gemini** as the LLM (1.5 Flash)
- **LangSmith** for observability and tracing
- **Temporal.io** for durable workflow orchestration
- **Express** for BFF API layer
- **Docker Compose** for service orchestration

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  BFF (API)  │────▶│  Temporal   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                     │
                           ▼                     ▼
                    ┌─────────────┐      ┌─────────────┐
                    │  LangSmith  │      │   Worker    │
                    └─────────────┘      └─────────────┘
                                                 │
                                                 ▼
                                          ┌─────────────┐
                                          │  LangGraph  │
                                          │    Agent    │
                                          │  (Gemini)   │
                                          └─────────────┘
```

## Quick Start

### Prerequisites
- Node.js 20.x
- Docker & Docker Compose
- npm 9.x or higher

### Setup

```bash
# 1. Navigate to project directory
cd /Users/ogarro/talks/js_nation_us_2025/poc

# 2. Run setup script
./scripts/setup.sh

# 3. (Optional) Edit .env to use real Gemini API
#    Get API key from: https://makersuite.google.com/app/apikey
#    Replace GOOGLE_API_KEY=mock with your key

# 4. Start all services
docker-compose up -d

# 5. Verify services are running
docker-compose ps

# 6. Check health
curl http://localhost:3000/health | jq .
```

## Testing the POC

### Basic Agent Execution

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

### Run E2E Tests

```bash
./scripts/test-e2e.sh
```

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
- Uses `gemini-1.5-flash` for fast, cost-effective responses
- Supports both real API and mock mode (development default)
- Automatic token counting
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

### 5. Durable Execution (Temporal)
- Each node as a durable activity
- Automatic retry on failures
- Workflow state persistence
- **Dashboard**: http://localhost:8080

### 6. BFF Pattern
- RESTful API gateway
- Request validation with Zod
- Rate limiting and security
- **Endpoint**: http://localhost:3000/api/agent/execute

## Project Structure

```
poc/
├── packages/
│   ├── shared/         # Shared types and utilities
│   ├── agent/          # LangGraph agent with Gemini
│   ├── temporal-worker/# Temporal workflows and activities
│   └── bff/            # Express API server
├── docker/             # Dockerfiles
├── scripts/            # Utility scripts
└── docker-compose.yml  # Service orchestration
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

**4. Using Mock vs Real Gemini**
- **Mock mode**: `GOOGLE_API_KEY=mock` (default, no costs)
- **Live mode**: Get API key from https://makersuite.google.com/app/apikey
- Check current mode: `curl http://localhost:3000/health | jq .gemini`

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
- [Temporal Documentation](https://docs.temporal.io)
- [LangSmith Documentation](https://docs.smith.langchain.com)
- [Express Documentation](https://expressjs.com)

## License

MIT - This is a demonstration POC for educational purposes.
