import { executeAgent } from './packages/agent/src/graph/builder';
import dotenv from 'dotenv';

dotenv.config();

async function testAgentHybrid() {
  console.log('=== Testing Hybrid Architecture (Standalone) ===\n');

  // Test without tools (should skip research)
  console.log('Test 1: Agent without tools (direct execution)');
  const result = await executeAgent({
    message: 'Who won the Super Bowl in 2023?',
    userId: 'test-user',
    settings: {
      enableGuardrails: true
    }
  });

  console.log('Result:', JSON.stringify(result.formattedResponse, null, 2));
  console.log('\nNodes executed:', result.metadata?.nodeExecutions?.map(n => n.nodeName));

  const expectedNodes = ['inputValidator', 'researchNode', 'synthesisNode', 'guardrail', 'responseFormatter'];
  const actualNodes = result.metadata?.nodeExecutions?.map(n => n.nodeName) || [];
  const allPresent = expectedNodes.every(node => actualNodes.includes(node));

  console.log(allPresent ? '✅ All nodes executed' : '❌ Missing nodes');
  console.log('\nResponse:', result.formattedResponse?.message.substring(0, 200));
}

testAgentHybrid().catch(console.error);
