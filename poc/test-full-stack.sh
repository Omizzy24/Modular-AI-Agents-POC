#!/bin/bash

# Test the full containerized stack (BFF → Temporal → Workers → Agent)

echo "🧪 Testing Full Stack: BFF → Temporal → Workers → Agent"
echo ""
echo "This will execute a workflow through Temporal (not direct agent execution)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Facts Query
echo "📊 Test 1: Facts Query (Temperature 0.3)"
echo "Question: Who won the Super Bowl in 2023?"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Who won the Super Bowl in 2023?",
    "userId": "test-user",
    "settings": {
      "temperature": 0.3,
      "maxTokens": 500,
      "enableGuardrails": true
    }
  }')

echo "$RESPONSE" | jq .

WORKFLOW_ID=$(echo "$RESPONSE" | jq -r '.workflowId')
echo ""
echo "✅ Workflow Created: $WORKFLOW_ID"
echo "🔗 View in Temporal UI: http://localhost:8080/namespaces/default/workflows/$WORKFLOW_ID"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 2: Analysis Query
echo "📊 Test 2: Analysis Query (Temperature 0.7)"
echo "Question: What makes a good basketball player?"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What makes a good basketball player?",
    "userId": "test-user",
    "settings": {
      "temperature": 0.7,
      "maxTokens": 500,
      "enableGuardrails": true
    }
  }')

echo "$RESPONSE" | jq .

WORKFLOW_ID=$(echo "$RESPONSE" | jq -r '.workflowId')
echo ""
echo "✅ Workflow Created: $WORKFLOW_ID"
echo "🔗 View in Temporal UI: http://localhost:8080/namespaces/default/workflows/$WORKFLOW_ID"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 3: Odds Query (Gambling Disclaimer)
echo "📊 Test 3: Odds Query (Temperature 0.5 + Gambling Disclaimer)"
echo "Question: What are the odds a team scores 100 points in basketball?"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3000/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are the odds a team scores 100 points in a basketball game?",
    "userId": "test-user",
    "settings": {
      "temperature": 0.5,
      "maxTokens": 500,
      "enableGuardrails": true
    }
  }')

echo "$RESPONSE" | jq .

WORKFLOW_ID=$(echo "$RESPONSE" | jq -r '.workflowId')
echo ""
echo "✅ Workflow Created: $WORKFLOW_ID"
echo "🔗 View in Temporal UI: http://localhost:8080/namespaces/default/workflows/$WORKFLOW_ID"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "🎉 All Tests Complete!"
echo ""
echo "📊 View all workflows in Temporal UI:"
echo "   http://localhost:8080"
echo ""
echo "📈 View traces in LangSmith (if enabled):"
echo "   https://smith.langchain.com"
echo ""
