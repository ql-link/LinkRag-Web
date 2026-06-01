import { apiClient, setToken, clearToken } from '@/lib/api-client';
import type {
  AuthResult,
  LoginRequest,
  RegisterRequest,
} from '@/types/api';

export async function login(data: LoginRequest): Promise<AuthResult> {
  const result = await apiClient.post<AuthResult>('/api/v1/auth/login', data);
  setToken(result.accessToken);
  return result;
}

export async function register(data: RegisterRequest): Promise<AuthResult> {
  const result = await apiClient.post<AuthResult>('/api/v1/auth/register', data);
  setToken(result.accessToken);
  return result;
}

export async function logout(): Promise<void> {
  await apiClient.post('/api/v1/auth/logout');
  clearToken();
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem('accessToken');
}

export { clearToken };
