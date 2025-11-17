import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../../activities/tools';

const { verifyStatsActivity, validateSourceActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '15 seconds',
  retry: {
    initialInterval: '2 seconds',
    maximumInterval: '10 seconds',
    backoffCoefficient: 2,
    maximumAttempts: 3
  }
});

export interface StatsVerificationInput {
  claim: string;
  sport: string;
}

export interface StatsVerificationResult {
  verified: boolean;
  confidence: number;
  sources: string[];
  details: string;
}

/**
 * Stats Verification Tool Workflow
 * Verifies sports statistics claims
 * Task Queue: external-api-tools
 */
export async function statsVerificationWorkflow(
  input: StatsVerificationInput
): Promise<StatsVerificationResult> {
  // Activity 1: Verify stats from official sources
  const verificationResult = await verifyStatsActivity(input.claim, input.sport);

  // Activity 2: Validate source credibility
  const sourceValidation = await validateSourceActivity(verificationResult.sources);

  return {
    verified: verificationResult.verified,
    confidence: sourceValidation.confidence,
    sources: verificationResult.sources,
    details: verificationResult.details
  };
}
