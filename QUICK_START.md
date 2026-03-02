# Quick Start Guide

## ✅ What's Already Done

- ✅ Project cloned and dependencies installed
- ✅ All packages built (shared, agent, temporal-worker, bff)
- ✅ API keys configured in `.env` file
- ✅ Ready to run once Docker is installed

## 🚀 Start the System (After Installing Docker)

```bash
cd modular_agents_poc/poc
docker compose up -d
```

Wait 30-60 seconds for services to start, then verify:

```bash
curl http://localhost:3000/health | jq .
```

## 🧪 Quick Tests

### Test 1: Basic Query
```bash
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "userId": "test"}' | jq .
```

### Test 2: Tool Invocation (Stats Verification)
```bash
curl -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Verify: Stephen Curry has made over 3,500 three-pointers",
    "userId": "test",
    "settings": {"enableGuardrails": true}
  }' | jq .
```

### Test 3: Run Full Test Suite
```bash
./scripts/test-e2e.sh
```

## 📊 Monitoring

- **Temporal UI**: http://localhost:8080
- **BFF Health**: http://localhost:3000/health
- **LangSmith**: https://smith.langchain.com (if configured)

## 🔧 Useful Commands

```bash
# View all services
docker compose ps

# View logs
docker compose logs -f

# Stop services
docker compose down

# Restart a service
docker compose restart bff
docker compose restart temporal-worker

# Rebuild after code changes
npm run build
docker compose build temporal-worker
docker compose restart temporal-worker
```

## 📁 Key Files

- **Setup Guide**: `SETUP_AND_TESTING_GUIDE.md` (comprehensive)
- **Spec**: `.kiro/specs/modular-agents-poc/`
- **Code**: `poc/packages/`
- **Config**: `poc/.env`
- **Docker**: `poc/docker-compose.yml`

## 🎯 Architecture at a Glance

```
HTTP Request → BFF (Express) → Temporal Workflow
                                    ↓
                              LangGraph Agent
                                    ↓
                         Tools (Child Workflows)
                                    ↓
                         External APIs (Gemini, Tavily)
```

## 🐛 Troubleshooting

**Services won't start?**
```bash
docker compose logs
docker compose down && docker compose up -d
```

**API errors?**
- Check `.env` has correct API keys
- Rebuild: `docker compose build temporal-worker && docker compose restart temporal-worker`

**Port conflicts?**
- Change ports in `.env` or `docker-compose.yml`

## 📚 Learn More

- Full setup guide: `SETUP_AND_TESTING_GUIDE.md`
- Technical docs: `poc/README.md`
- Architecture: `.kiro/specs/modular-agents-poc/design.md`
- Requirements: `.kiro/specs/modular-agents-poc/requirements.md`
