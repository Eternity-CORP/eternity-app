/**
 * Web Bridge Service
 * Handles bridge execution, approval, and status polling.
 * Uses ethers.js for signing; shared types for bridge API data.
 */

import { ethers } from 'ethers'
import {
  type BridgeQuoteResult,
  type BridgeStatusResult,
  type BridgeErrorCode,
  type BridgeError,
  fetchBridgeStatus,
  ERC20_ALLOWANCE_ABI,
  ERC20_APPROVE_ABI,
  LIFI_CONTRACT_ADDRESSES,
  sleep,
} from '@e-y/shared'

export type { BridgeErrorCode, BridgeError }

const MAX_UINT256 = '115792089237316195423570985008687907853269984665640564039457584007913129639935'
const STATUS_POLL_INTERVAL = 5000
const MAX_POLL_ATTEMPTS = 120 // 10 minutes

/**
 * Check if a token approval is needed for the bridge contract
 */
export async function checkBridgeAllowance(
  provider: ethers.JsonRpcProvider,
  tokenAddress: string,
  ownerAddress: string,
  chainId: number,
): Promise<boolean> {
  if (tokenAddress === '0x0000000000000000000000000000000000000000') {
    return true // native tokens don't need approval
  }

  const spender = LIFI_CONTRACT_ADDRESSES[chainId]
  if (!spender) return false

  const contract = new ethers.Contract(tokenAddress, ERC20_ALLOWANCE_ABI, provider)
  const allowance = await contract.allowance(ownerAddress, spender) as bigint
  return allowance > BigInt(0)
}

/**
 * Approve token spending for bridge contract
 */
export async function approveBridgeToken(
  wallet: ethers.HDNodeWallet,
  provider: ethers.JsonRpcProvider,
  tokenAddress: string,
  chainId: number,
): Promise<string> {
  const spender = LIFI_CONTRACT_ADDRESSES[chainId]
  if (!spender) throw createBridgeError('APPROVAL_FAILED', 'Bridge contract not found for this chain')

  const signer = wallet.connect(provider)
  const contract = new ethers.Contract(tokenAddress, ERC20_APPROVE_ABI, signer)

  try {
    const tx = await contract.approve(spender, MAX_UINT256) as ethers.TransactionResponse
    const receipt = await tx.wait()
    if (!receipt || receipt.status === 0) {
      throw createBridgeError('APPROVAL_FAILED', 'Approval transaction reverted')
    }
    return tx.hash
  } catch (err: unknown) {
    if (isUserRejection(err)) {
      throw createBridgeError('USER_REJECTED', 'User rejected approval')
    }
    throw createBridgeError('APPROVAL_FAILED', getErrorMessage(err))
  }
}

/**
 * Execute a bridge transaction using the quote's transaction request
 */
export async function executeBridge(
  quote: BridgeQuoteResult,
  wallet: ethers.HDNodeWallet,
  provider: ethers.JsonRpcProvider,
): Promise<string> {
  if (!quote.transactionRequest) {
    throw createBridgeError('EXECUTION_FAILED', 'No transaction data in bridge quote')
  }

  const signer = wallet.connect(provider)
  const txReq = quote.transactionRequest

  try {
    const tx = await signer.sendTransaction({
      to: txReq.to,
      data: txReq.data,
      value: BigInt(txReq.value),
      gasLimit: BigInt(txReq.gasLimit),
    })

    const receipt = await tx.wait()
    if (!receipt || receipt.status === 0) {
      throw createBridgeError('EXECUTION_FAILED', 'Bridge transaction reverted')
    }
    return tx.hash
  } catch (err: unknown) {
    if (isUserRejection(err)) {
      throw createBridgeError('USER_REJECTED', 'User rejected transaction')
    }
    const msg = getErrorMessage(err)
    if (msg.includes('insufficient')) {
      throw createBridgeError('INSUFFICIENT_GAS', 'Not enough gas for bridge transaction')
    }
    throw createBridgeError('EXECUTION_FAILED', msg)
  }
}

/**
 * Poll bridge status until completion or timeout
 */
export async function waitForBridgeCompletion(
  txHash: string,
  fromChainId: number,
  toChainId: number,
  onStatusUpdate?: (status: BridgeStatusResult) => void,
): Promise<BridgeStatusResult> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(STATUS_POLL_INTERVAL)

    const status = await fetchBridgeStatus(txHash, fromChainId, toChainId)
    onStatusUpdate?.(status)

    if (status.status === 'DONE' || status.status === 'FAILED') {
      return status
    }
  }

  return { status: 'FAILED', message: 'Bridge timed out' }
}

/**
 * Full bridge flow: check allowance → approve → execute → poll
 */
export async function executeBridgeWithRetry(
  quote: BridgeQuoteResult,
  wallet: ethers.HDNodeWallet,
  provider: ethers.JsonRpcProvider,
  onStep?: (step: string) => void,
  onStatusUpdate?: (status: BridgeStatusResult) => void,
): Promise<{ txHash: string; result: BridgeStatusResult }> {
  // Step 1: Check & approve if needed
  const fromToken = quote.transactionRequest
    ? quote.fromToken
    : '0x0000000000000000000000000000000000000000'

  if (fromToken !== '0x0000000000000000000000000000000000000000') {
    onStep?.('Checking allowance...')
    const hasAllowance = await checkBridgeAllowance(
      provider,
      fromToken,
      wallet.address,
      quote.fromChainId,
    )
    if (!hasAllowance) {
      onStep?.('Approving token...')
      await approveBridgeToken(wallet, provider, fromToken, quote.fromChainId)
    }
  }

  // Step 2: Execute bridge
  onStep?.('Sending bridge transaction...')
  const txHash = await executeBridge(quote, wallet, provider)

  // Step 3: Poll for completion
  onStep?.('Waiting for bridge completion...')
  const result = await waitForBridgeCompletion(
    txHash,
    quote.fromChainId,
    quote.toChainId,
    onStatusUpdate,
  )

  return { txHash, result }
}

function createBridgeError(code: BridgeErrorCode, message: string): BridgeError {
  return { code, message }
}

function isUserRejection(err: unknown): boolean {
  const msg = getErrorMessage(err)
  return msg.includes('rejected') || msg.includes('denied') || msg.includes('cancelled')
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return 'Unknown error'
}
