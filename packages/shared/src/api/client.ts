/**
 * Shared API Client
 * Configurable fetch wrapper — both apps create one instance with their base URL.
 * Zero runtime dependencies — uses only fetch() and AbortController.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export interface ApiClientConfig {
  baseUrl: string;
  defaultTimeout?: number;
  defaultHeaders?: Record<string, string>;
}

export interface RequestOptions {
  timeout?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

interface InternalRequestOptions extends RequestOptions {
  method: string;
  body?: string;
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const data = (await response.json()) as Record<string, unknown>;
    return new ApiError(
      (data.message as string) || response.statusText,
      response.status,
      data.code as string | undefined,
      data,
    );
  } catch {
    return new ApiError(response.statusText, response.status);
  }
}

async function request<T>(
  url: string,
  options: InternalRequestOptions,
  config: ApiClientConfig,
): Promise<T> {
  const timeout = options.timeout ?? config.defaultTimeout ?? 30000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Chain external signal if provided
  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await fetch(url, {
      method: options.method,
      body: options.body,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...config.defaultHeaders,
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw await parseErrorResponse(response);
    }

    const text = await response.text();
    return (text ? JSON.parse(text) : null) as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new NetworkError('Request timeout', error);
      }
      throw new NetworkError(error.message, error);
    }

    throw new NetworkError('Unknown error');
  }
}

export interface ApiClient {
  get<T>(endpoint: string, options?: RequestOptions): Promise<T>;
  post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T>;
  put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T>;
  patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T>;
  delete<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T>;
  withWallet(address: string): ApiClient;
  withHeaders(headers: Record<string, string>): ApiClient;
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  function buildUrl(endpoint: string): string {
    return endpoint.startsWith('http') ? endpoint : `${config.baseUrl}${endpoint}`;
  }

  const client: ApiClient = {
    get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
      return request<T>(buildUrl(endpoint), { ...options, method: 'GET' }, config);
    },

    post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
      return request<T>(
        buildUrl(endpoint),
        { ...options, method: 'POST', body: body != null ? JSON.stringify(body) : undefined },
        config,
      );
    },

    put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
      return request<T>(
        buildUrl(endpoint),
        { ...options, method: 'PUT', body: body != null ? JSON.stringify(body) : undefined },
        config,
      );
    },

    patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
      return request<T>(
        buildUrl(endpoint),
        { ...options, method: 'PATCH', body: body != null ? JSON.stringify(body) : undefined },
        config,
      );
    },

    delete<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
      return request<T>(
        buildUrl(endpoint),
        { ...options, method: 'DELETE', body: body != null ? JSON.stringify(body) : undefined },
        config,
      );
    },

    withWallet(address: string): ApiClient {
      return createApiClient({
        ...config,
        defaultHeaders: {
          ...config.defaultHeaders,
          'x-wallet-address': address,
        },
      });
    },

    withHeaders(headers: Record<string, string>): ApiClient {
      return createApiClient({
        ...config,
        defaultHeaders: {
          ...config.defaultHeaders,
          ...headers,
        },
      });
    },
  };

  return client;
}

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
