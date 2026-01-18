/**
 * Centralized API Client
 * Handles all HTTP requests with consistent error handling
 */

import { API_BASE_URL } from '@/src/config/api';
import { createLogger } from '@/src/utils/logger';

const log = createLogger('ApiClient');

/**
 * API Error with structured information
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }
}

/**
 * Network error for connection failures
 */
export class NetworkError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

interface RequestOptions extends RequestInit {
  timeout?: number;
}

interface ApiResponse<T> {
  data: T;
  status: number;
}

/**
 * Parse error response from API
 */
async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const data = await response.json();
    return new ApiError(
      data.message || response.statusText,
      response.status,
      data.code,
      data
    );
  } catch {
    return new ApiError(response.statusText, response.status);
  }
}

/**
 * Make HTTP request with timeout and error handling
 */
async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { timeout = 30000, ...fetchOptions } = options;

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    log.debug(`${fetchOptions.method || 'GET'} ${endpoint}`);

    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await parseErrorResponse(response);
      log.warn(`Request failed: ${endpoint}`, { status: response.status, error: error.message });
      throw error;
    }

    // Handle empty responses
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    return { data, status: response.status };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        log.error(`Request timeout: ${endpoint}`);
        throw new NetworkError('Request timeout', error);
      }
      log.error(`Network error: ${endpoint}`, error);
      throw new NetworkError(error.message, error);
    }

    throw new NetworkError('Unknown error');
  }
}

/**
 * API Client with typed methods
 */
export const apiClient = {
  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const response = await request<T>(endpoint, { ...options, method: 'GET' });
    return response.data;
  },

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const response = await request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.data;
  },

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const response = await request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.data;
  },

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const response = await request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.data;
  },

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const response = await request<T>(endpoint, { ...options, method: 'DELETE' });
    return response.data;
  },

  /**
   * Create request with wallet address header
   */
  withWallet(walletAddress: string) {
    const headers = { 'x-wallet-address': walletAddress };

    return {
      get: <T>(endpoint: string, options?: RequestOptions) =>
        apiClient.get<T>(endpoint, { ...options, headers: { ...options?.headers, ...headers } }),

      post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
        apiClient.post<T>(endpoint, body, { ...options, headers: { ...options?.headers, ...headers } }),

      put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
        apiClient.put<T>(endpoint, body, { ...options, headers: { ...options?.headers, ...headers } }),

      patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
        apiClient.patch<T>(endpoint, body, { ...options, headers: { ...options?.headers, ...headers } }),

      delete: <T>(endpoint: string, options?: RequestOptions) =>
        apiClient.delete<T>(endpoint, { ...options, headers: { ...options?.headers, ...headers } }),
    };
  },
};

/**
 * Helper to extract error message
 */
export function getErrorMessage(error: unknown): string {
  if (ApiError.isApiError(error)) {
    return error.message;
  }
  if (error instanceof NetworkError) {
    return 'Network connection failed. Please check your internet.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
