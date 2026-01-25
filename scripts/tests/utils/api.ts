/**
 * API Client Utilities for Integration Tests
 */

export const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
}

export interface RequestOptions {
  headers?: Record<string, string>;
}

export async function request<T = unknown>(
  method: 'GET' | 'PUT' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${path}`;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);
  const data = await response.json().catch(() => null);

  return { status: response.status, data: data as T };
}

export async function get<T = unknown>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
  return request<T>('GET', path, undefined, options);
}

export async function post<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
  return request<T>('POST', path, body, options);
}

export async function put<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
  return request<T>('PUT', path, body, options);
}

export async function del<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
  return request<T>('DELETE', path, body, options);
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const { status } = await get('/health');
    return status === 200;
  } catch {
    return false;
  }
}
