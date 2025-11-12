// Minimal ERC-20 ABI for balance, transfer, approve, allowance, metadata
export const ERC20_ABI = [
  // balance
  "function balanceOf(address owner) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  // transfer
  "function transfer(address to, uint256 amount) returns (bool)",
  // approval
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  // metadata
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
];
