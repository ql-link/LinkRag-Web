import { beforeEach, describe, it, expect, vi } from 'vitest';
import {
  ApiError,
  apiClient,
  clearToken,
  getToken,
  isAuthError,
  isForbiddenError,
  isConflictError,
  setToken,
} from './api-client';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('ApiError', () => {
  it('should create an error with code and message', () => {
    const error = new ApiError(404, '资源不存在');
    expect(error.code).toBe(404);
    expect(error.message).toBe('资源不存在');
    expect(error.name).toBe('ApiError');
    expect(error.data).toBeNull();
  });

  it('should include optional data', () => {
    const data = { field: 'email', reason: 'invalid' };
    const error = new ApiError(422, '参数错误', data);
    expect(error.data).toEqual(data);
  });
});

describe('error type guards', () => {
  it('isAuthError returns true for 401', () => {
    expect(isAuthError(new ApiError(401, '未登录'))).toBe(true);
    expect(isAuthError(new ApiError(403, '无权限'))).toBe(false);
    expect(isAuthError(new Error('random'))).toBe(false);
  });

  it('isForbiddenError returns true for 403', () => {
    expect(isForbiddenError(new ApiError(403, '无权限'))).toBe(true);
    expect(isForbiddenError(new ApiError(401, '未登录'))).toBe(false);
  });

  it('isConflictError returns true for 409', () => {
    expect(isConflictError(new ApiError(409, '冲突'))).toBe(true);
    expect(isConflictError(new ApiError(400, '错误'))).toBe(false);
  });
});

describe('isolated auth scopes', () => {
  it('stores C-side and admin-side credentials independently', () => {
    setToken('user-token');
    setToken('admin-token', 'admin');

    expect(getToken()).toBe('user-token');
    expect(getToken('admin')).toBe('admin-token');

    clearToken('admin');
    expect(getToken()).toBe('user-token');
    expect(getToken('admin')).toBeNull();
  });

  it('uses the admin credential for admin APIs and the user credential for C-side APIs', async () => {
    setToken('user-token');
    setToken('admin-token', 'admin');
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: vi.fn().mockResolvedValue({ code: 200, message: 'ok', data: {} }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiClient.get('/api/v1/admin/users/dashboard');
    await apiClient.get('/api/v1/user/profile');

    expect(fetchMock.mock.calls[0][1].headers.satoken).toBe('admin-token');
    expect(fetchMock.mock.calls[1][1].headers.satoken).toBe('user-token');
  });
});
