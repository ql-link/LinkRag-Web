import { apiClient } from '@/lib/api-client';

export async function uploadAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.postForm<string>('/api/v1/oss-files/avatar', formData);
}
