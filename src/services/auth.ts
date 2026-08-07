import { apiClient, setToken, clearToken, type AuthScope } from '@/lib/api-client';
import type { AuthResult, LoginRequest, RegisterRequest } from '@/types/api';

export async function login(data: LoginRequest, scope: AuthScope = 'user'): Promise<AuthResult> {
  const result = await apiClient.post<AuthResult>('/api/v1/auth/login', data, { authScope: scope });
  setToken(result.accessToken, scope);
  return result;
}

export async function register(data: RegisterRequest): Promise<AuthResult> {
  const result = await apiClient.post<AuthResult>('/api/v1/auth/register', data);
  setToken(result.accessToken);
  return result;
}

export async function logout(scope: AuthScope = 'user'): Promise<void> {
  await apiClient.post('/api/v1/auth/logout', undefined, { authScope: scope });
  clearToken(scope);
}

export function isLoggedIn(scope: AuthScope = 'user'): boolean {
  return !!localStorage.getItem(scope === 'admin' ? 'adminAccessToken' : 'accessToken');
}

export { clearToken };
