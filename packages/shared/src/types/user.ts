/**
 * User-related types
 */

export interface User {
  id: string;
  walletAddress: string;
  username?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  walletAddress: string;
  username?: string;
}
