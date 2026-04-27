import { Result, PageResult } from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public data: unknown = null
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

function setToken(token: string) {
  localStorage.setItem('accessToken', token);
}

function clearToken() {
  localStorage.removeItem('accessToken');
}

async function request<T>(
  method: string,
  path: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean>;
  } = {}
): Promise<T> {
  const { body, headers = {}, params } = options;

  let url = `${API_BASE_URL}${path}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const token = getToken();
  if (token) {
    requestHeaders['satoken'] = token;
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);

  if (response.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new ApiError(401, '未登录或登录已过期');
  }

  const result: Result<T> = await response.json();

  if (result.code !== 200) {
    throw new ApiError(result.code, result.message, result.data);
  }

  return result.data;
}

export const apiClient = {
  get<T>(path: string, params?: Record<string, string | number | boolean>): Promise<T> {
    return request<T>('GET', path, { params });
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('POST', path, { body });
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('PATCH', path, { body });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>('DELETE', path);
  },

  postForm<T>(path: string, formData: FormData): Promise<T> {
    return request<T>('POST', path, {
      headers: {},
      body: formData,
    });
  },
};

export { setToken, clearToken, getToken };

export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 401;
}

export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 403;
}

export function isConflictError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 409;
}