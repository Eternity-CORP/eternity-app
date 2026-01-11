import { isAddress, getAddress } from 'ethers';

/**
 * Validate Ethereum address
 */
export const isValidAddress = (address: string): boolean => {
  return isAddress(address);
};

/**
 * Normalize address to checksum format
 */
export const checksumAddress = (address: string): string => {
  if (!isAddress(address)) {
    throw new Error('Invalid address');
  }
  return getAddress(address);
};
