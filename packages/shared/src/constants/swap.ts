/**
 * Swap-related constants
 */

export const LIFI_API_URL = 'https://li.quest/v1';

export const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

export const POPULAR_TOKEN_SYMBOLS = [
  'ETH', 'WETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'LINK', 'UNI',
];

/**
 * LI.FI diamond contract address — same across most chains
 */
export const LIFI_CONTRACT_ADDRESSES: Record<number, string> = {
  1: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
  137: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
  42161: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
  8453: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
  10: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
};

/**
 * ERC-20 ABI fragments used for allowance checks and approvals
 */
export const ERC20_ALLOWANCE_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
] as const;

export const ERC20_APPROVE_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
] as const;
