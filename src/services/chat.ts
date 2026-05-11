import { apiClient } from '@/lib/api-client';
import type {
  ConversationDTO,
  MessageDTO,
  CreateConversationRequest,
  UpdateConversationRequest,
  PageResult,
} from '@/types/api';

export async function getConversations(
  page = 1,
  pageSize = 20
): Promise<PageResult<ConversationDTO>> {
  return apiClient.get<PageResult<ConversationDTO>>('/api/v1/chat/conversations', {
    page,
    pageSize,
  });
}

export async function createConversation(
  data: CreateConversationRequest
): Promise<ConversationDTO> {
  return apiClient.post<ConversationDTO>('/api/v1/chat/conversations', data);
}

export async function updateConversation(
  id: number,
  data: UpdateConversationRequest
): Promise<ConversationDTO> {
  return apiClient.patch<ConversationDTO>(`/api/v1/chat/conversations/${id}`, data);
}

export async function deleteConversation(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/chat/conversations/${id}`);
}

export async function getMessages(
  conversationId: number,
  page = 1,
  pageSize = 50
): Promise<PageResult<MessageDTO>> {
  return apiClient.get<PageResult<MessageDTO>>(
    `/api/v1/chat/conversations/${conversationId}/messages`,
    { page, pageSize }
  );
}

export async function sendMessage(
  conversationId: number,
  content: string,
  configId?: number
): Promise<MessageDTO> {
  return apiClient.post<MessageDTO>(
    `/api/v1/chat/conversations/${conversationId}/messages`,
    { content, configId }
  );
}
