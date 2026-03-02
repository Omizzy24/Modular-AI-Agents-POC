# Modular Agents POC - Setup and Testing Guide

## Overview

This guide will help you set up, run, and test the production-ready AI orchestration system that combines LangGraph with Temporal.io.

## Prerequisites

### Required Software

1. **Node.js 20.x or higher**
   ```bash
   node --version  # Should show v20.x.x or higher
   ```

2. **Docker Desktop for macOS**
   - Download from: https://www.docker.com/products/docker-desktop
   - After installation, verify:
   ```bash
   docker --version
   docker compose version
   ```

3. **npm 9.x or higher**
   ```bash
   npm --version  # Should show 9.x.x or higher
   ```

### Required API Keys

You'll need the following API keys (already configured in your `.env` file):

1. **Google Gemini API Key** ✅ Configured
   - Get from: https://makersuite.google.com/app/apikey
   - Used for: LLM processing and natural language understanding

2. **Tavily API Key** ✅ Configured
   - Get from: https://tavily.com
   - Used for: Real-time web search and sports data

3. **LangSmith API Key** ✅ Configured (Optional)
   - Get from: https://smith.langchain.com
   - Used for: LLM tracing and observability

## Setup Steps

### 1. Install Docker Desktop

**For macOS:**
1. Download Docker Desktop from https://www.docker.com/products/docker-desktop
2. Open the downloaded `.dmg` file
3. Drag Docker to your Applications folder
4. Launch Docker Desktop from Applications
5. Wait for Docker to start (you'll see the Docker icon in your menu bar)
6. Verify installation:
   ```bash
   docker --version
   docker compose version
   ```

### 2. Build the Project

The project is already built! We've completed:
- ✅ Installed all npm dependencies
- ✅ Built shared package
- ✅ Built temporal-worker package
- ✅ Built agent package
- ✅ Built BFF package
- ✅ Created .env file with your API keys

If you need to rebuild:
```bash
cd modular_agents_poc/poc
npm run build
```

### 3. Start Docker Services

Once Docker is installed and running:

```bash
cd modular_agents_poc/poc
docker compose up -d
```

This will start 6 containers:
1. **postgres** - PostgreSQL database for Temporal state
2. **temporal** - Temporal server for workflow orchestration
3. **temporal-ui** - Web UI for monitoring workflows
4. **temporal-worker** (×2) - Worker processes for executing workflows
5. **bff** - Backend-for-Frontend Express API server

### 4. Verify Services

Check that all services are running:
```bash
docker compose ps
```

You should see all services with status "Up" or "healthy".

### 5. Check System Health

```bash
curl http://localhost:3000/health | jq .
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-01T...",
  "services": {
    "bff": "up",
    "temporal": "connected",
    "workers": "active"
  }
}
```

## Testing the System

### Test 1: Basic Agent Execution

Test a simple query without tool invocation:

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

**Expected:** A successful response with the agent's greeting and metadata.

### Test 2: Stats Verification with Tool Invocation

This demonstrates the hybrid architecture - the LLM will call the `verify_stats` tool twice:

```bash
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Verify this claim and provide sources: Stephen Curry has made over 3,500 three-pointers in his career. The New York Knicks are the team that he has scored the most points against.",
    "userId": "test-user",
    "settings": {"enableGuardrails": true}
  }' | jq .
```

**What Happens:**
1. BFF validates request → Creates Temporal workflow
2. Workflow executes LangGraph with tool binding
3. LLM analyzes query → Decides to call `verify_stats` tool twice
4. Each tool call spawns a `StatsVerificationWorkflow` child workflow
5. Results aggregated with confidence scores + sources

**Check Temporal UI:** Open http://localhost:8080 to see the parent workflow and 2 child workflows!

### Test 3: Odds Calculation

```bash
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the odds that the Miami Hurricanes make the CFB playoff this season?",
    "userId": "test-user"
  }' | jq .
```

**Expected:** Probability calculation with automatic gambling disclaimer.

### Test 4: Error Handling

Test validation with an empty message:

```bash
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "message": "",
    "userId": "test-user"
  }' | jq .
```

**Expected:** Validation error with appropriate HTTP status code.

### Test 5: Run E2E Test Suite

The repository includes a comprehensive E2E test suite:

```bash
cd modular_agents_poc/poc
./scripts/test-e2e.sh
```

**Tests Include:**
- ✅ BFF Health Check
- ✅ Temporal UI Accessibility
- ✅ Full Agent Execution with Tool Invocation
- ✅ Validation Error Handling
- ✅ Guardrail PII Detection

## Monitoring and Observability

### Temporal UI

Access the Temporal UI at: **http://localhost:8080**

**What You Can See:**
- All workflow executions with timeline
- Parent-child workflow hierarchy
- Activity input/output and retry history
- Complete audit trail for all AI decisions

**How to Use:**
1. Open http://localhost:8080
2. Click on "Workflows" in the left sidebar
3. Click on any workflow to see its execution details
4. Explore the timeline, events, and activity results

### LangSmith Tracing (Optional)

If you configured LangSmith, access traces at: **https://smith.langchain.com**

**What You Can See:**
- Every LLM call with prompts and responses
- Performance metrics and token usage
- Debugging information for agent decisions

### Application Logs

View logs from all services:

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f bff
docker compose logs -f temporal-worker
```

## Architecture Verification

### Verify Hybrid Two-Layer Pattern

1. **Layer 1 (Session-Level Durability):**
   - Each API request creates one Temporal workflow
   - The workflow wraps the entire LangGraph execution
   - Check in Temporal UI: You'll see `agentOrchestrationWorkflow`

2. **Layer 2 (Action-Level Durability):**
   - Each tool invocation spawns a child workflow
   - Check in Temporal UI: Click on a parent workflow to see child workflows
   - Child workflows: `WebSearchWorkflow`, `StatsVerificationWorkflow`, `OddsCalculationWorkflow`

### Verify LangGraph Nodes

The agent executes through these nodes:
1. **inputValidator** - Validates and sanitizes input
2. **researchNode** - Determines if external data is needed
3. **synthesisNode** - Processes LLM responses and tool results
4. **guardrail** - Applies safety filters
5. **responseFormatter** - Structures final response

Check the response metadata to see which nodes were executed.

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker compose logs

# Restart services
docker compose down
docker compose up -d
```

### Temporal Connection Failed

- Ensure Docker services are running: `docker compose ps`
- Wait for Temporal health check to pass (can take 30-60 seconds)
- Check `TEMPORAL_ADDRESS` in `.env`

### BFF Returns 500 Errors

- Check worker is registered: `docker compose logs temporal-worker`
- Verify Temporal is healthy: `curl http://localhost:7233`
- Check API keys are set correctly in `.env`

### API Key Issues

If you get authentication errors:

1. **Gemini API:**
   - Verify key at https://makersuite.google.com/app/apikey
   - Check `.env` has correct `GOOGLE_API_KEY`

2. **Tavily API:**
   - Verify key at https://tavily.com
   - Check `.env` has correct `TAVILY_API_KEY`

3. **After changing .env:**
   ```bash
   docker compose build temporal-worker
   docker compose restart temporal-worker
   docker compose restart bff
   ```

### Port Conflicts

If ports are already in use:

- **3000** (BFF): Change `BFF_PORT` in `.env`
- **7233** (Temporal): Change `TEMPORAL_ADDRESS` in `.env`
- **8080** (Temporal UI): Modify `docker-compose.yml`
- **5432** (PostgreSQL): Modify `docker-compose.yml`

## Development Workflow

### Running Locally (Without Docker for Development)

```bash
# Terminal 1: Start Temporal infrastructure only
docker compose up temporal postgres temporal-ui -d

# Terminal 2: Start Temporal Worker locally
cd packages/temporal-worker
npm run dev

# Terminal 3: Start BFF locally
cd packages/bff
npm run dev
```

### Making Code Changes

1. Make your changes in the appropriate package
2. Rebuild the package:
   ```bash
   npm run build:shared    # If you changed shared
   npm run build:agent     # If you changed agent
   npm run build:temporal  # If you changed temporal-worker
   npm run build:bff       # If you changed bff
   ```
3. Restart the affected service:
   ```bash
   docker compose restart temporal-worker
   docker compose restart bff
   ```

### Running Unit Tests

```bash
# Run all tests
npm test

# Run tests for specific package
npm test --workspace=@poc/shared
npm test --workspace=@poc/agent
npm test --workspace=@poc/temporal-worker
npm test --workspace=@poc/bff
```

## Production Considerations

This POC demonstrates production-ready patterns. For actual production deployment:

### Security
- [ ] Implement proper authentication/authorization
- [ ] Use secrets management (e.g., HashiCorp Vault)
- [ ] Enable TLS for all services
- [ ] Add API key rotation
- [ ] Implement rate limiting per API key

### Scalability
- [ ] Use Kubernetes for orchestration
- [ ] Implement horizontal pod autoscaling
- [ ] Add caching layer (Redis)
- [ ] Configure Temporal worker pools
- [ ] Set up load balancing

### Monitoring
- [ ] Add Prometheus metrics
- [ ] Implement distributed tracing (OpenTelemetry)
- [ ] Set up alerting (PagerDuty)
- [ ] Monitor Gemini API quotas
- [ ] Track cost per request

### Cost Optimization
- [ ] Use Gemini 1.5 Flash for most requests
- [ ] Upgrade to Gemini 1.5 Pro only when needed
- [ ] Implement request caching
- [ ] Monitor token usage
- [ ] Set up budget alerts

## Next Steps

Now that you have the system running:

1. **Explore the Temporal UI** - See workflows in action
2. **Try different queries** - Test various agent capabilities
3. **Review the code** - Understand the implementation
4. **Modify and extend** - Add new tools or capabilities
5. **Run the test suite** - Verify everything works

## Support

- **Documentation**: See `poc/README.md` for detailed technical docs
- **Architecture**: See `.kiro/specs/modular-agents-poc/design.md`
- **Requirements**: See `.kiro/specs/modular-agents-poc/requirements.md`
- **Tasks**: See `.kiro/specs/modular-agents-poc/tasks.md`

## Summary

You now have:
- ✅ Complete project setup with all dependencies
- ✅ API keys configured
- ✅ All packages built and ready
- ✅ Comprehensive testing guide
- ✅ Monitoring and observability setup
- ✅ Troubleshooting documentation

**Once Docker is installed, run:**
```bash
cd modular_agents_poc/poc
docker compose up -d
curl http://localhost:3000/health | jq .
```

Then start testing with the examples above!
