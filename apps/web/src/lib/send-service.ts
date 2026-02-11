/**
 * Web Send Service
 * Handles ETH and ERC-20 token transfers via ethers.
 */

import { ethers, Contract, Transaction, parseEther, parseUnits, formatEther } from 'ethers'
import { ERC20_TRANSFER_ABI, type GasEstimate } from '@e-y/shared'

const ERC20_ABI = ERC20_TRANSFER_ABI as unknown as string[]

export type { GasEstimate }

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
 * Sign a transaction without broadcasting (for scheduled payments)
 */
export async function signTransaction(
  wallet: ethers.HDNodeWallet,
  provider: ethers.JsonRpcProvider,
  to: string,
  amount: string,
): Promise<{ signedTx: string; nonce: number; gasPrice: string; chainId: number }> {
  const feeData = await provider.getFeeData()
  const gasPrice = feeData.gasPrice || BigInt(0)
  const nonce = await provider.getTransactionCount(wallet.address)
  const network = await provider.getNetwork()
  const chainId = Number(network.chainId)
  const value = parseEther(amount)

  const gasEstimate = await provider.estimateGas({
    from: wallet.address,
    to,
    value,
  })
  const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100)

  const tx = Transaction.from({
    to,
    value,
    gasLimit,
    gasPrice,
    nonce,
    chainId,
    type: 0,
  })

  const signedTx = await wallet.signTransaction(tx)

  return { signedTx, nonce, gasPrice: gasPrice.toString(), chainId }
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
