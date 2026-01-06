import { networkLogger } from './networkLogger';
import { API_BASE_URL } from '../config/env';

export type RiskLevel = 'safe' | 'caution' | 'warning';

export interface RiskFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface RecipientStats {
  previousTransactions: number;
  firstInteraction: string | null;
  isContract: boolean;
  addressAge: string;
}

export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  reasons: RiskFactor[];
  recipientStats: RecipientStats;
}

export interface AssessRiskParams {
  recipientAddress: string;
  amount: string;
  token: string;
  chainId: string;
  senderAddress: string;
}

/**
 * Assess transaction risk
 */
export const assessRisk = async (params: AssessRiskParams): Promise<RiskAssessment> => {
  try {
    const response = await networkLogger.loggedFetch(`${API_BASE_URL}/risk/assess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Risk assessment failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Risk assessment error:', error);
    // Return safe default if service unavailable
    return getDefaultRiskAssessment();
  }
};

/**
 * Get risk level from score
 */
export const getRiskLevelFromScore = (score: number): RiskLevel => {
  if (score <= 33) return 'safe';
  if (score <= 66) return 'caution';
  return 'warning';
};

/**
 * Get risk color based on level
 */
export const getRiskColor = (level: RiskLevel): string => {
  switch (level) {
    case 'safe':
      return '#22C55E';
    case 'caution':
      return '#EAB308';
    case 'warning':
      return '#EF4444';
  }
};

/**
 * Get risk header text based on level
 */
export const getRiskHeader = (level: RiskLevel): string => {
  switch (level) {
    case 'safe':
      return 'SAFE TRANSACTION';
    case 'caution':
      return 'REVIEW CAREFULLY';
    case 'warning':
      return 'HIGH RISK';
  }
};

/**
 * Default risk assessment when service unavailable
 */
const getDefaultRiskAssessment = (): RiskAssessment => ({
  score: 50,
  level: 'caution',
  reasons: [
    {
      factor: 'service_unavailable',
      impact: 0,
      description: 'Risk assessment service unavailable - proceed with caution',
    },
  ],
  recipientStats: {
    previousTransactions: 0,
    firstInteraction: null,
    isContract: false,
    addressAge: 'unknown',
  },
});

/**
 * Calculate local risk score (offline fallback)
 */
export const calculateLocalRisk = (params: {
  isKnownRecipient: boolean;
  isContract: boolean;
  isContractVerified: boolean;
  amountDeviation: number;
}): RiskAssessment => {
  const factors: RiskFactor[] = [];
  let score = 50;

  // Known recipient
  if (params.isKnownRecipient) {
    factors.push({
      factor: 'known_recipient',
      impact: -20,
      description: 'You have sent to this address before',
    });
    score -= 20;
  } else {
    factors.push({
      factor: 'new_recipient',
      impact: +15,
      description: 'First-time interaction with this address',
    });
    score += 15;
  }

  // Contract verification
  if (params.isContract) {
    if (params.isContractVerified) {
      factors.push({
        factor: 'verified_contract',
        impact: -15,
        description: 'Contract is verified',
      });
      score -= 15;
    } else {
      factors.push({
        factor: 'unverified_contract',
        impact: +25,
        description: 'Contract is NOT verified',
      });
      score += 25;
    }
  }

  // Amount deviation
  if (params.amountDeviation > 5) {
    factors.push({
      factor: 'amount_very_high',
      impact: +40,
      description: `Amount is ${params.amountDeviation.toFixed(1)}x your average`,
    });
    score += 40;
  } else if (params.amountDeviation > 2) {
    factors.push({
      factor: 'amount_high',
      impact: +20,
      description: `Amount is ${params.amountDeviation.toFixed(1)}x your average`,
    });
    score += 20;
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    level: getRiskLevelFromScore(score),
    reasons: factors,
    recipientStats: {
      previousTransactions: params.isKnownRecipient ? 1 : 0,
      firstInteraction: null,
      isContract: params.isContract,
      addressAge: 'unknown',
    },
  };
};
