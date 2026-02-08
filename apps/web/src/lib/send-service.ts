/**
 * Web Send Service
 * Handles ETH and ERC-20 token transfers via ethers.
 */

import { ethers, Contract, parseEther, parseUnits, formatEther } from 'ethers'

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
]

export interface GasEstimate {
  gasLimit: string
  gasPrice: string
  totalGasCost: string
  totalGasCostUsd: number
}

/**
 * Send native token (ETH/MATIC)
 */
export async function sendNativeToken(
  wallet: ethers.HDNodeWallet,
  provider: ethers.JsonRpcProvider,
  to: string,
  amount: string,
): Promise<string> {
  const connectedWallet = wallet.connect(provider)
  const tx = await connectedWallet.sendTransaction({
    to,
    value: parseEther(amount),
  })
  return tx.hash
}

/**
 * Send ERC-20 token
 */
export async function sendErc20Token(
  wallet: ethers.HDNodeWallet,
  provider: ethers.JsonRpcProvider,
  to: string,
  amount: string,
  tokenAddress: string,
  decimals: number,
): Promise<string> {
  const connectedWallet = wallet.connect(provider)
  const contract = new Contract(tokenAddress, ERC20_ABI, connectedWallet)
  const amountInUnits = parseUnits(amount, decimals)
  const tx = await contract.transfer(to, amountInUnits)
  return tx.hash
}

/**
 * Estimate gas for ETH or ERC-20 transfer
 */
export async function estimateGas(
  provider: ethers.JsonRpcProvider,
  from: string,
  to: string,
  amount: string,
  token?: { address: string; decimals: number },
  ethPrice?: number,
): Promise<GasEstimate> {
  let gasLimit: bigint

  if (!token) {
    gasLimit = await provider.estimateGas({
      from,
      to,
      value: parseEther(amount),
    })
  } else {
    const contract = new Contract(token.address, ERC20_ABI, provider)
    const amountInUnits = parseUnits(amount, token.decimals)
    gasLimit = await contract.transfer.estimateGas(to, amountInUnits, { from })
  }

  const feeData = await provider.getFeeData()
  const gasPrice = feeData.gasPrice || BigInt(0)
  const totalGasCost = gasLimit * gasPrice
  const totalGasCostEth = formatEther(totalGasCost)
  const totalGasCostUsd = parseFloat(totalGasCostEth) * (ethPrice || 0)

  return {
    gasLimit: gasLimit.toString(),
    gasPrice: gasPrice.toString(),
    totalGasCost: totalGasCostEth,
    totalGasCostUsd,
  }
}
