import { Context } from '@temporalio/activity';
import { createLogger } from '@poc/shared';
import { TavilySearchAPIWrapper } from '@langchain/tavily';

const logger = createLogger('temporal:activity:statsVerification');

// Trusted sports sources for verification
const TRUSTED_SPORTS_DOMAINS = [
  'espn.com',
  'nba.com',
  'nfl.com',
  'mlb.com',
  'nhl.com',
  'si.com',
  'sportsillustrated.com',
  'cbssports.com',
  'bleacherreport.com',
  'thescore.com',
  'yahoo.com/sports',
  'sportingnews.com'
];

// Official league sites get highest trust
const OFFICIAL_LEAGUE_DOMAINS = [
  'nba.com',
  'nfl.com',
  'mlb.com',
  'nhl.com',
  'ussoccer.com',
  'mls.com'
];

interface VerificationResult {
  verified: boolean;
  sources: string[];
  details: string;
}

interface SourceValidation {
  confidence: number;
  trustScore: number;
}

/**
 * Verify stats from official sources using Tavily advanced search
 */
export async function verifyStatsActivity(
  claim: string,
  sport: string
): Promise<VerificationResult> {
  const { info } = Context.current();
  logger.info('Verifying stats with Tavily', { claim, sport, workflowId: info.workflowExecution.workflowId });

  try {
    // Initialize Tavily API wrapper
    const tavily = new TavilySearchAPIWrapper({
      tavilyApiKey: process.env.TAVILY_API_KEY,
    });

    // Search for the claim in sports context with advanced depth
    const searchQuery = `${sport} ${claim} official statistics`;
    const response = await tavily.rawResults({
      query: searchQuery,
      maxResults: 10,
      searchDepth: 'advanced'
    });

    // Extract results array from response
    const tavilyResults = response.results || [];

    // Extract sources and check against trusted domains
    const foundSources: string[] = [];
    let trustedSourceCount = 0;

    for (const result of tavilyResults) {
      const url = result.url || result.source || '';
      if (!url) continue;

      // Extract domain from URL
      try {
        const domain = new URL(url).hostname.replace('www.', '');

        // Check if it's a trusted source
        const isTrusted = TRUSTED_SPORTS_DOMAINS.some(trusted =>
          domain.includes(trusted) || trusted.includes(domain)
        );

        if (isTrusted) {
          foundSources.push(domain);
          trustedSourceCount++;
        }
      } catch (e) {
        logger.warn('Failed to parse URL', { url });
      }
    }

    // Verification logic: at least 2 trusted sources = verified
    const verified = trustedSourceCount >= 2;
    const details = verified
      ? `Claim verified across ${trustedSourceCount} trusted ${sport} sources.`
      : `Insufficient trusted sources found. Only ${trustedSourceCount} trusted source(s) confirmed.`;

    logger.info('Stats verification complete', { verified, trustedSourceCount });

    return {
      verified,
      sources: foundSources,
      details
    };

  } catch (error) {
    logger.error('Error verifying stats with Tavily', { error });

    // Fallback response on error
    return {
      verified: false,
      sources: [],
      details: 'Unable to verify claim due to search error. Please try again.'
    };
  }
}

/**
 * Validate source credibility based on domain reputation
 */
export async function validateSourceActivity(sources: string[]): Promise<SourceValidation> {
  const { info } = Context.current();
  logger.info('Validating sources', { sources, workflowId: info.workflowExecution.workflowId });

  if (sources.length === 0) {
    return {
      confidence: 0,
      trustScore: 0
    };
  }

  let totalScore = 0;
  let weightedCount = 0;

  for (const source of sources) {
    // Check if it's an official league site (highest trust)
    const isOfficialLeague = OFFICIAL_LEAGUE_DOMAINS.some(official =>
      source.includes(official) || official.includes(source)
    );

    if (isOfficialLeague) {
      totalScore += 1.0; // Maximum trust
      weightedCount += 1.5; // Extra weight for official sources
      continue;
    }

    // Check if it's a trusted sports source
    const isTrusted = TRUSTED_SPORTS_DOMAINS.some(trusted =>
      source.includes(trusted) || trusted.includes(source)
    );

    if (isTrusted) {
      totalScore += 0.8; // High trust
      weightedCount += 1.0;
      continue;
    }

    // Unknown source gets lower score
    totalScore += 0.3;
    weightedCount += 0.5;
  }

  // Calculate weighted average
  const trustScore = weightedCount > 0 ? totalScore / weightedCount : 0;
  const confidence = Math.min(0.98, trustScore * (1 + (sources.length * 0.05))); // Bonus for multiple sources

  logger.info('Source validation complete', {
    sourcesCount: sources.length,
    trustScore: trustScore.toFixed(2),
    confidence: confidence.toFixed(2)
  });

  return {
    confidence: Math.round(confidence * 100) / 100,
    trustScore: Math.round(trustScore * 100) / 100
  };
}
