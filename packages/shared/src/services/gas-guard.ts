/**
 * Gas Guard — pure helper to check if user has enough native token for gas.
 * No ethers dependency. Accepts pre-fetched values.
 */

export interface GasGuardResult {
  sufficient: boolean;
  nativeBalance: string;
  estimatedGasCostEth: string;
  estimatedGasCostUsd: number;
  networkId: string;
  nativeSymbol: string;
  shortfall: string;
}

/**
 * Check if user has enough native token to cover gas on a network.
 */
export function checkGasAvailability(
  networkId: string,
  nativeSymbol: string,
  nativeBalance: string,
  estimatedGasCostEth: string,
  nativeTokenPriceUsd: number,
): GasGuardResult {
  const balance = parseFloat(nativeBalance) || 0;
  const gasCost = parseFloat(estimatedGasCostEth) || 0;
  const sufficient = balance >= gasCost;
  const shortfall = sufficient ? '0' : (gasCost - balance).toFixed(8);

  return {
    sufficient,
    nativeBalance,
    estimatedGasCostEth,
    estimatedGasCostUsd: gasCost * nativeTokenPriceUsd,
    networkId,
    nativeSymbol,
    shortfall,
  };
}
