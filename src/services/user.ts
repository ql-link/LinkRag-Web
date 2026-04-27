import { apiClient } from '@/lib/api-client';
import type {
  UserProfileDTO,
  UpdateProfileRequest,
} from '@/types/api';

export async function getProfile(): Promise<UserProfileDTO> {
  return apiClient.get<UserProfileDTO>('/api/v1/user/profile');
}

export async function updateProfile(data: UpdateProfileRequest): Promise<void> {
  await apiClient.patch('/api/v1/user/profile', data);
}