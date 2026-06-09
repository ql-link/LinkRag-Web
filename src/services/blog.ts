import { apiClient } from '@/lib/api-client';
import type {
  PageResult,
  BlogPostAdminListDTO,
  BlogPostAdminDetailDTO,
  BlogPostPublicListDTO,
  BlogPostPublicDetailDTO,
  BlogAssetDTO,
  CreateBlogPostRequest,
  UpdateBlogPostRequest,
  BlogPostStatus,
  BlogAssetType,
} from '@/types/api';

// ── Admin API ─────────────────────────────────────────────────────────────

export async function createDraft(data: CreateBlogPostRequest): Promise<BlogPostAdminDetailDTO> {
  return apiClient.post<BlogPostAdminDetailDTO>('/api/v1/admin/blog/posts', data);
}

export async function updateMetadata(postId: number, data: UpdateBlogPostRequest): Promise<BlogPostAdminDetailDTO> {
  return apiClient.patch<BlogPostAdminDetailDTO>(`/api/v1/admin/blog/posts/${postId}`, data);
}

export async function getAdminPosts(
  page: number = 1,
  pageSize: number = 20,
  status?: BlogPostStatus,
): Promise<PageResult<BlogPostAdminListDTO>> {
  const params: Record<string, string | number> = { page, pageSize };
  if (status) {
    params.status = status;
  }
  return apiClient.get<PageResult<BlogPostAdminListDTO>>('/api/v1/admin/blog/posts', params);
}

export async function getAdminPostDetail(postId: number): Promise<BlogPostAdminDetailDTO> {
  return apiClient.get<BlogPostAdminDetailDTO>(`/api/v1/admin/blog/posts/${postId}`);
}

export async function uploadContentMarkdown(postId: number, file: File): Promise<BlogPostAdminDetailDTO> {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.postForm<BlogPostAdminDetailDTO>(`/api/v1/admin/blog/posts/${postId}/content`, formData);
}

export async function uploadAsset(postId: number, assetType: BlogAssetType, file: File): Promise<BlogAssetDTO> {
  const formData = new FormData();
  formData.append('assetType', assetType);
  formData.append('file', file);
  return apiClient.postForm<BlogAssetDTO>(`/api/v1/admin/blog/posts/${postId}/assets`, formData);
}

export async function getAssets(postId: number): Promise<BlogAssetDTO[]> {
  return apiClient.get<BlogAssetDTO[]>(`/api/v1/admin/blog/posts/${postId}/assets`);
}

export async function deleteAsset(postId: number, assetId: number): Promise<void> {
  return apiClient.delete<void>(`/api/v1/admin/blog/posts/${postId}/assets/${assetId}`);
}

export async function publishPost(postId: number): Promise<BlogPostAdminDetailDTO> {
  return apiClient.post<BlogPostAdminDetailDTO>(`/api/v1/admin/blog/posts/${postId}/publish`);
}

export async function unpublishPost(postId: number): Promise<BlogPostAdminDetailDTO> {
  return apiClient.post<BlogPostAdminDetailDTO>(`/api/v1/admin/blog/posts/${postId}/unpublish`);
}

export async function deletePost(postId: number): Promise<void> {
  return apiClient.delete<void>(`/api/v1/admin/blog/posts/${postId}`);
}

// ── Public API ────────────────────────────────────────────────────────────

export async function getPublicPosts(page: number = 1, pageSize: number = 20): Promise<PageResult<BlogPostPublicListDTO>> {
  return apiClient.get<PageResult<BlogPostPublicListDTO>>('/api/v1/blog/posts', { page, pageSize });
}

export async function getPublicPostDetail(slug: string): Promise<BlogPostPublicDetailDTO> {
  return apiClient.get<BlogPostPublicDetailDTO>(`/api/v1/blog/posts/${slug}`);
}
