// API Response types
export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// Pagination
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

// User types
export interface User {
  id: string;
  username: string | null;
  createdAt: string;
}

// Wallet types
export interface Wallet {
  address: string;
  name: string;
}

// Transaction types
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  status: TransactionStatus;
  timestamp: string;
}
