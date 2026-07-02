import { apiClient } from '@/lib/api-client';
import { normalizePublicUrl } from '@/lib/public-url';

export async function uploadAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  return normalizePublicUrl(await apiClient.postForm<string>('/api/v1/oss-files/avatar', formData)) ?? '';
}
