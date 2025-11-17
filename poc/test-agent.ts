import { executeAgent } from './packages/agent/src/graph/builder';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env from the poc directory
const envPath = path.resolve(__dirname, '.env');
console.log('=== Environment Debug ===');
console.log('Current directory:', __dirname);
console.log('Looking for .env at:', envPath);
console.log('.env file exists:', fs.existsSync(envPath));

const result = dotenv.config({ path: envPath });
if (result.error) {
  console.log('dotenv error:', result.error);
} else {
  console.log('dotenv loaded successfully');
}

// Debug: Check if API key is loaded
const apiKey = process.env.GOOGLE_API_KEY;
console.log('API Key loaded:', apiKey ? 'YES' : 'NO');
if (apiKey) {
  console.log('API Key length:', apiKey.length);
  console.log('API Key preview:', `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
} else {
  console.log('ERROR: GOOGLE_API_KEY not found in environment!');
}
console.log('========================\n');

async function testAgent() {
  console.log('=== Testing Sports Research Agent ===\n');

  // Test 1: Facts query
  console.log('Test 1: Facts Query (Temperature 0.3)');
  const factsResult = await executeAgent({
    message: 'Who won the Super Bowl in 2023?',
    userId: 'test-user',
    settings: {
      temperature: 0.3,
      maxTokens: 500,
      enableGuardrails: true
    }
  });
  console.log('Facts Result:', JSON.stringify(factsResult.formattedResponse, null, 2));
  console.log('\n---\n');

  // Test 2: Analysis query
  console.log('Test 2: Analysis Query (Temperature 0.7)');
  const analysisResult = await executeAgent({
    message: 'What makes a good basketball player?',
    userId: 'test-user',
    settings: {
      temperature: 0.7,
      maxTokens: 500,
      enableGuardrails: true
    }
  });
  console.log('Analysis Result:', JSON.stringify(analysisResult.formattedResponse, null, 2));
  console.log('\n---\n');

  // Test 3: Odds query (should trigger gambling disclaimer)
  console.log('Test 3: Odds Query (Temperature 0.5 + Gambling Disclaimer)');
  const oddsResult = await executeAgent({
    message: 'What are the odds a team scores 100 points in a basketball game?',
    userId: 'test-user',
    settings: {
      temperature: 0.5,
      maxTokens: 500,
      enableGuardrails: true
    }
  });
  console.log('Odds Result:', JSON.stringify(oddsResult.formattedResponse, null, 2));

  console.log('\n=== All Tests Complete ===');
}

testAgent().catch(console.error);
