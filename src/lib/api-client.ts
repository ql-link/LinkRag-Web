import { Result } from '@/types/api';

// 默认用相对路径：生产由 nginx 把 /api 转发到后端；如需指定绝对地址可设 VITE_API_BASE_URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/** Default request timeout in milliseconds */
const DEFAULT_TIMEOUT = 15_000;

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

export function isAuthError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 401;
}

export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 403;
}

export function isConflictError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 409;
}

type ToastHandler = (type: 'error' | 'success' | 'info', message: string) => void;
let toastHandler: ToastHandler | null = null;

export function setToastHandler(handler: ToastHandler) {
  toastHandler = handler;
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

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  /** Request timeout in milliseconds. Defaults to 15s. Set to 0 to disable. */
  timeout?: number;
  /** AbortSignal for external cancellation (e.g. component unmount) */
  signal?: AbortSignal;
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, headers = {}, params, timeout = DEFAULT_TIMEOUT, signal } = options;
  const isFormData = body instanceof FormData;

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

  const requestHeaders: Record<string, string> = { ...headers };

  if (!isFormData) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const token = getToken();
  if (token) {
    requestHeaders['satoken'] = token;
  }

  const config: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body !== undefined) {
    config.body = isFormData ? body as FormData : JSON.stringify(body);
  }

  // Support both internal timeout and external abort signal
  const controller = new AbortController();
  let timeoutId: number | undefined;

  if (timeout > 0) {
    timeoutId = window.setTimeout(() => controller.abort(), timeout);
  }

  // If an external signal is provided, forward its abort to our controller
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  config.signal = controller.signal;

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // If externally aborted, don't show toast
      if (signal?.aborted) {
        throw new ApiError(0, '请求已取消');
      }
      const message = '请求超时，请稍后重试';
      toastHandler?.('error', message);
      throw new ApiError(0, message);
    }
    const message = '网络连接异常，请稍后重试';
    toastHandler?.('error', message);
    throw new ApiError(0, message);
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }

  let result: Result<T>;
  try {
    result = await response.json();
  } catch {
    const message = `服务器响应异常 (${response.status})`;
    toastHandler?.('error', message);
    throw new ApiError(response.status, message);
  }

  if (result.code !== 200) {
    const isAuth = response.status === 401 || result.code === 401;
    const message = result.message || (isAuth ? '未登录或登录已过期' : '请求失败');
    if (isAuth) {
      clearToken();
    }
    toastHandler?.('error', message);
    throw new ApiError(result.code || response.status, message, result.data);
  }

  return result.data;
}

export const apiClient = {
  get<T>(path: string, params?: Record<string, string | number | boolean>, options?: Pick<RequestOptions, 'timeout' | 'signal'>): Promise<T> {
    return request<T>('GET', path, { params, ...options });
  },

  post<T>(path: string, body?: unknown, options?: Pick<RequestOptions, 'timeout' | 'signal'>): Promise<T> {
    return request<T>('POST', path, { body, ...options });
  },

  patch<T>(path: string, body?: unknown, options?: Pick<RequestOptions, 'timeout' | 'signal'>): Promise<T> {
    return request<T>('PATCH', path, { body, ...options });
  },

  delete<T>(path: string, options?: Pick<RequestOptions, 'timeout' | 'signal'>): Promise<T> {
    return request<T>('DELETE', path, options);
  },

  postForm<T>(path: string, formData: FormData, options?: Pick<RequestOptions, 'timeout' | 'signal'>): Promise<T> {
    return request<T>('POST', path, {
      headers: {},
      body: formData,
      // File uploads typically need longer timeout
      timeout: options?.timeout ?? 60_000,
      signal: options?.signal,
    });
  },
};

export { setToken, clearToken, getToken };
