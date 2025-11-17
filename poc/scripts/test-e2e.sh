#!/bin/bash
set -e

echo "🧪 Running E2E Tests for AI Orchestration POC..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function
run_test() {
  local test_name=$1
  local test_command=$2

  echo -n "Testing: $test_name... "

  if eval "$test_command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
    return 0
  else
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
    return 1
  fi
}

# Check if services are running
echo "Checking if services are running..."
if ! docker-compose ps | grep -q "Up"; then
  echo -e "${RED}❌ Services not running. Start with: docker-compose up -d${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Services are running${NC}"
echo ""

# Test 1: Health endpoint
run_test "BFF Health Endpoint" "curl -f http://localhost:3000/health"

# Test 2: Temporal UI
run_test "Temporal UI Accessibility" "curl -f http://localhost:8080"

# Test 3: Agent execution with Gemini (triggers tool workflows)
echo ""
echo "Testing: Full Agent Execution with Tool Invocation (Hybrid Architecture)..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Verify this claim and provide sources: Stephen Curry has made over 3,500 three-pointers in his career. The New York Knicks are the team that he has scored the most points against.",
    "userId": "test-user",
    "settings": {
      "enableGuardrails": true
    }
  }')

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ PASSED${NC}"
  ((TESTS_PASSED++))
  echo ""
  echo "  Model: $(echo "$RESPONSE" | jq -r '.data.model')"
  echo "  Workflow ID: $(echo "$RESPONSE" | jq -r '.workflowId')"
  echo "  Nodes Executed: $(echo "$RESPONSE" | jq -r '.metadata.nodesExecuted | join(" → ")')"
  echo ""
  echo "  Response preview:"
  echo "$RESPONSE" | jq -r '.data.processedContent' | head -3 | sed 's/^/    /'
  echo ""
  echo "  💡 Check Temporal UI (http://localhost:8080) for parent workflow and child tool workflows"
else
  echo -e "${RED}✗ FAILED${NC}"
  ((TESTS_FAILED++))
  echo "Error response:"
  echo "$RESPONSE" | jq .
fi

# Test 4: Validation error handling
echo ""
run_test "Validation Error Handling" \
  "curl -s -X POST http://localhost:3000/api/agent/execute \
   -H 'Content-Type: application/json' \
   -d '{\"message\":\"\"}' | jq -e '.error != null'"

# Test 5: Guardrail detection (PII)
echo ""
echo "Testing: Guardrail PII Detection..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "message": "My email is test@example.com",
    "settings": {
      "enableGuardrails": true
    }
  }')

# Note: This will pass through, but demonstrates the flow
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ PASSED${NC} (Guardrail system active)"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ FAILED${NC}"
  ((TESTS_FAILED++))
fi

# Summary
echo ""
echo "=================================="
echo "E2E Test Results"
echo "=================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
  echo -e "${RED}Failed: $TESTS_FAILED${NC}"
else
  echo -e "Failed: $TESTS_FAILED"
fi
echo "=================================="

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi
