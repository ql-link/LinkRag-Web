import { apiClient, type AuthScope } from '@/lib/api-client';
import { normalizePublicUrl } from '@/lib/public-url';
import type { UserProfileDTO, UpdateProfileRequest } from '@/types/api';

export async function getProfile(scope: AuthScope = 'user'): Promise<UserProfileDTO> {
  const profile = await apiClient.get<UserProfileDTO>('/api/v1/user/profile', undefined, { authScope: scope });
  return {
    ...profile,
    avatarUrl: normalizePublicUrl(profile.avatarUrl),
  };
}

export async function updateProfile(data: UpdateProfileRequest): Promise<void> {
  const payload: UpdateProfileRequest = { ...data };
  if ('avatarUrl' in payload) {
    payload.avatarUrl = normalizePublicUrl(payload.avatarUrl) ?? undefined;
  }
  await apiClient.patch('/api/v1/user/profile', payload);
}
