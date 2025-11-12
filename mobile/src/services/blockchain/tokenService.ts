import { ethers, BigNumber } from 'ethers';
import { getProvider, getProviderWithFallback } from './ethereumProvider';
import type { Network } from '../../constants/rpcUrls';
import { getSigner } from '../walletService';
import { ERC20_ABI } from '../../constants/abis';

function getTokenContract(address: string, signerOrProvider: ethers.Signer | ethers.providers.Provider) {
  return new ethers.Contract(address, ERC20_ABI, signerOrProvider);
}

export async function getTokenBalance(tokenAddress: string, walletAddress: string, network?: Network): Promise<BigNumber> {
  // Validate addresses before making contract call
  if (!ethers.utils.isAddress(tokenAddress)) {
    throw new Error(`Invalid token address: ${tokenAddress}`);
  }
  if (!ethers.utils.isAddress(walletAddress)) {
    throw new Error(`Invalid wallet address: ${walletAddress}`);
  }

  try {
    let provider = getProvider(network);
    let contract = getTokenContract(tokenAddress, provider);
    try {
      const balance: BigNumber = await contract.balanceOf(walletAddress);
      return balance;
    } catch (providerError: any) {
      // Fallback to a working RPC (useful for web/CORS issues)
      provider = await getProviderWithFallback(network);
      contract = getTokenContract(tokenAddress, provider);
      const balance: BigNumber = await contract.balanceOf(walletAddress);
      return balance;
    }
  } catch (error: any) {
    // Check if it's a contract call error (token doesn't exist)
    if (error.code === 'CALL_EXCEPTION') {
      console.warn(`Token contract at ${tokenAddress} doesn't exist on ${network || 'default network'}`);
      return ethers.BigNumber.from(0);
    }
    throw error;
  }
}

export async function sendToken(tokenAddress: string, to: string, amount: string, network?: Network): Promise<{ txHash: string; response: ethers.providers.TransactionResponse; receipt?: ethers.providers.TransactionReceipt }> {
  const signer = await getSigner(network);
  const contract = getTokenContract(tokenAddress, signer);
  const decimals: number = await contract.decimals();
  const value = ethers.utils.parseUnits(amount, decimals);
  const tx = await contract.transfer(to, value);
  let receipt: ethers.providers.TransactionReceipt | undefined;
  try { receipt = await tx.wait(1); } catch {}
  return { txHash: tx.hash, response: tx, receipt };
}

export async function approveToken(tokenAddress: string, spender: string, amount: string, network?: Network): Promise<{ txHash: string; response: ethers.providers.TransactionResponse; receipt?: ethers.providers.TransactionReceipt }> {
  const signer = await getSigner(network);
  const contract = getTokenContract(tokenAddress, signer);
  const decimals: number = await contract.decimals();
  const value = ethers.utils.parseUnits(amount, decimals);
  const tx = await contract.approve(spender, value);
  let receipt: ethers.providers.TransactionReceipt | undefined;
  try { receipt = await tx.wait(1); } catch {}
  return { txHash: tx.hash, response: tx, receipt };
}

export async function estimateTokenGas(tokenAddress: string, to: string, amount: string, network?: Network): Promise<{ gasLimit: BigNumber; gasPrice: BigNumber; feeEth: string }> {
  const signer = await getSigner(network);
  const contract = getTokenContract(tokenAddress, signer);
  const decimals: number = await contract.decimals();
  const value = ethers.utils.parseUnits(amount || '0', decimals);
  const gasLimit: BigNumber = await contract.estimateGas.transfer(to, value);
  const gasPrice: BigNumber = await signer.getGasPrice();
  const feeWei = gasLimit.mul(gasPrice);
  const feeEth = ethers.utils.formatEther(feeWei);
  return { gasLimit, gasPrice, feeEth };
}
