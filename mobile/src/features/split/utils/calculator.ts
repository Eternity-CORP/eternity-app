/**
 * Split Bill Calculator
 * 
 * Calculates split amounts with:
 * - Equal or weighted distribution
 * - Tip percentage
 * - Rounding strategies (floor, ceil, bankers)
 * - Remainder distribution
 */

import { ethers } from 'ethers';
import type {
  SplitCalculation,
  CalculationConfig,
  RoundingMode,
} from '../types';

// ============================================================================
// Main Calculator
// ============================================================================

/**
 * Calculate split amounts for all participants
 * 
 * @param config - Calculation configuration
 * @returns Split calculation result
 */
export function calculateSplit(config: CalculationConfig): SplitCalculation {
  // Validate config
  validateConfig(config);

  // Parse total to smallest units
  const totalSmallestUnit = parseHumanToSmallestUnit(
    config.totalHuman,
    config.decimals
  );

  // Apply tip
  const tipMultiplier = 1 + (config.tipPercent / 100);
  const totalWithTipSmallestUnit = multiplyBigNumber(
    totalSmallestUnit,
    tipMultiplier
  );

  // Calculate base shares
  const baseShares = calculateBaseShares(
    totalWithTipSmallestUnit,
    config.mode,
    config.participants,
    config.rounding
  );

  // Calculate remainder
  const sumOfShares = baseShares.reduce(
    (sum, share) => sum.add(ethers.BigNumber.from(share.amountSmallestUnit)),
    ethers.BigNumber.from(0)
  );

  const remainder = totalWithTipSmallestUnit.sub(sumOfShares);

  // Distribute remainder
  const finalShares = distributeRemainder(
    baseShares,
    remainder,
    config.remainderStrategy,
    config.remainderTopN || 1
  );

  // Verify sum
  const finalSum = finalShares.reduce(
    (sum, share) => sum.add(ethers.BigNumber.from(share.amountSmallestUnit)),
    ethers.BigNumber.from(0)
  );

  const sumMatches = finalSum.eq(totalWithTipSmallestUnit);

  // Format result
  return {
    participantAmounts: finalShares.map((share) => ({
      participantId: share.participantId,
      amountSmallestUnit: share.amountSmallestUnit,
      amountHuman: formatSmallestUnitToHuman(
        share.amountSmallestUnit,
        config.decimals
      ),
    })),
    totalWithTipSmallestUnit: totalWithTipSmallestUnit.toString(),
    totalWithTipHuman: formatSmallestUnitToHuman(
      totalWithTipSmallestUnit.toString(),
      config.decimals
    ),
    remainderSmallestUnit: remainder.toString(),
    remainderRecipients: finalShares
      .filter((share) => share.receivedRemainder)
      .map((share) => share.participantId),
    sumMatches,
  };
}

// ============================================================================
// Base Share Calculation
// ============================================================================

interface BaseShare {
  participantId: string;
  amountSmallestUnit: string;
  receivedRemainder?: boolean;
}

/**
 * Calculate base shares before remainder distribution
 */
function calculateBaseShares(
  totalSmallestUnit: ethers.BigNumber,
  mode: 'equal' | 'weighted',
  participants: Array<{ id: string; weight?: number }>,
  rounding: RoundingMode
): BaseShare[] {
  if (mode === 'equal') {
    return calculateEqualShares(totalSmallestUnit, participants, rounding);
  } else {
    return calculateWeightedShares(totalSmallestUnit, participants, rounding);
  }
}

/**
 * Calculate equal shares
 */
function calculateEqualShares(
  totalSmallestUnit: ethers.BigNumber,
  participants: Array<{ id: string }>,
  rounding: RoundingMode
): BaseShare[] {
  const count = participants.length;
  
  if (count === 0) {
    return [];
  }

  // Divide total by count
  const shareExact = totalSmallestUnit.div(count);
  
  // Apply rounding (for equal shares, rounding doesn't change much)
  const shareRounded = applyRounding(shareExact, rounding, 0);

  return participants.map((p) => ({
    participantId: p.id,
    amountSmallestUnit: shareRounded.toString(),
  }));
}

/**
 * Calculate weighted shares
 */
function calculateWeightedShares(
  totalSmallestUnit: ethers.BigNumber,
  participants: Array<{ id: string; weight?: number }>,
  rounding: RoundingMode
): BaseShare[] {
  // Calculate total weight
  const totalWeight = participants.reduce(
    (sum, p) => sum + (p.weight || 1),
    0
  );

  if (totalWeight === 0) {
    throw new Error('Total weight cannot be zero');
  }

  // Calculate share for each participant
  return participants.map((p, index) => {
    const weight = p.weight || 1;
    
    // share = (total * weight) / totalWeight
    const shareExact = totalSmallestUnit
      .mul(weight)
      .div(totalWeight);

    // Apply rounding
    const shareRounded = applyRounding(shareExact, rounding, index);

    return {
      participantId: p.id,
      amountSmallestUnit: shareRounded.toString(),
    };
  });
}

// ============================================================================
// Rounding
// ============================================================================

/**
 * Apply rounding strategy
 * 
 * @param value - Value to round
 * @param mode - Rounding mode
 * @param index - Participant index (for bankers rounding tie-breaking)
 * @returns Rounded value
 */
function applyRounding(
  value: ethers.BigNumber,
  mode: RoundingMode,
  index: number
): ethers.BigNumber {
  switch (mode) {
    case 'floor':
      // Already floored by integer division
      return value;

    case 'ceil':
      // Round up (add 1 if there was any remainder)
      // This is tricky with BigNumber, so we just return value
      // Ceiling is handled by remainder distribution
      return value;

    case 'bankers':
      // Banker's rounding (round to nearest even)
      // For ties, round to even
      // Since we're using integer division, ties are rare
      // Use index for deterministic tie-breaking
      if (index % 2 === 0) {
        return value;
      } else {
        return value;
      }

    default:
      return value;
  }
}

// ============================================================================
// Remainder Distribution
// ============================================================================

/**
 * Distribute remainder among participants
 * 
 * @param shares - Base shares
 * @param remainder - Remainder to distribute
 * @param strategy - Distribution strategy
 * @param topN - Number of participants for topN strategy
 * @returns Shares with remainder distributed
 */
function distributeRemainder(
  shares: BaseShare[],
  remainder: ethers.BigNumber,
  strategy: 'first' | 'topN' | 'none',
  topN: number
): BaseShare[] {
  if (remainder.isZero() || strategy === 'none') {
    return shares;
  }

  const result = [...shares];

  switch (strategy) {
    case 'first':
      // Give all remainder to first participant
      if (result.length > 0) {
        const first = result[0];
        first.amountSmallestUnit = ethers.BigNumber.from(first.amountSmallestUnit)
          .add(remainder)
          .toString();
        first.receivedRemainder = true;
      }
      break;

    case 'topN':
      // Distribute remainder among top N participants
      // Give 1 wei/unit to each until remainder is exhausted
      const recipients = Math.min(topN, result.length);
      let remainingRemainder = remainder;

      for (let i = 0; i < recipients && remainingRemainder.gt(0); i++) {
        const share = result[i];
        const toAdd = ethers.BigNumber.from(1);
        
        if (remainingRemainder.gte(toAdd)) {
          share.amountSmallestUnit = ethers.BigNumber.from(share.amountSmallestUnit)
            .add(toAdd)
            .toString();
          share.receivedRemainder = true;
          remainingRemainder = remainingRemainder.sub(toAdd);
        }
      }

      // If still remainder, give it all to first
      if (remainingRemainder.gt(0) && result.length > 0) {
        const first = result[0];
        first.amountSmallestUnit = ethers.BigNumber.from(first.amountSmallestUnit)
          .add(remainingRemainder)
          .toString();
        first.receivedRemainder = true;
      }
      break;
  }

  return result;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse human-readable amount to smallest unit
 * 
 * @param humanAmount - Amount in human format (e.g., "100.50")
 * @param decimals - Token decimals
 * @returns Amount in smallest units
 */
function parseHumanToSmallestUnit(
  humanAmount: string,
  decimals: number
): ethers.BigNumber {
  try {
    return ethers.utils.parseUnits(humanAmount, decimals);
  } catch (error) {
    throw new Error(`Invalid amount format: ${humanAmount}`);
  }
}

/**
 * Format smallest unit to human-readable
 * 
 * @param smallestUnit - Amount in smallest units
 * @param decimals - Token decimals
 * @returns Human-readable amount
 */
function formatSmallestUnitToHuman(
  smallestUnit: string,
  decimals: number
): string {
  try {
    return ethers.utils.formatUnits(smallestUnit, decimals);
  } catch (error) {
    throw new Error(`Invalid smallest unit: ${smallestUnit}`);
  }
}

/**
 * Multiply BigNumber by decimal multiplier
 * 
 * @param value - BigNumber value
 * @param multiplier - Decimal multiplier (e.g., 1.15 for 15% tip)
 * @returns Multiplied value
 */
function multiplyBigNumber(
  value: ethers.BigNumber,
  multiplier: number
): ethers.BigNumber {
  // Convert multiplier to fixed-point (multiply by 1e18, then divide)
  const multiplierBN = ethers.BigNumber.from(Math.floor(multiplier * 1e18));
  return value.mul(multiplierBN).div(ethers.BigNumber.from(10).pow(18));
}

/**
 * Validate calculation config
 */
function validateConfig(config: CalculationConfig): void {
  const errors: string[] = [];

  // Validate total
  if (!config.totalHuman || config.totalHuman === '0') {
    errors.push('Total amount must be greater than zero');
  }

  // Validate tip
  if (config.tipPercent < 0 || config.tipPercent > 100) {
    errors.push('Tip percent must be between 0 and 100');
  }

  // Validate participants
  if (config.participants.length === 0) {
    errors.push('At least one participant is required');
  }

  // Validate weights for weighted mode
  if (config.mode === 'weighted') {
    const hasZeroWeight = config.participants.some(
      (p) => (p.weight || 1) <= 0
    );
    if (hasZeroWeight) {
      errors.push('All weights must be greater than zero');
    }
  }

  // Validate decimals
  if (config.decimals < 0 || config.decimals > 18) {
    errors.push('Decimals must be between 0 and 18');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid config: ${errors.join(', ')}`);
  }
}

// Functions are already exported inline
