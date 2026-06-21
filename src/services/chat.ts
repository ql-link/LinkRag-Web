import { apiClient } from '@/lib/api-client';
import type {
  ChatTurnDTO,
  ConversationDTO,
  CreateConversationRequest,
  UpdateConversationRequest,
  PageResult,
  UiChatMessage,
} from '@/types/api';

type BackendPageResult<T> = PageResult<T> & {
  records?: T[];
};

function normalizePageResult<T>(page: BackendPageResult<T>): PageResult<T> {
  return {
    ...page,
    items: page.items ?? page.records ?? [],
  };
}

export async function getConversations(page = 1, pageSize = 20): Promise<PageResult<ConversationDTO>> {
  return apiClient.get<PageResult<ConversationDTO>>('/api/v1/chat/conversations', {
    page,
    pageSize,
  });
}

export async function createConversation(data: CreateConversationRequest): Promise<ConversationDTO> {
  return apiClient.post<ConversationDTO>('/api/v1/chat/conversations', data);
}

export async function updateConversation(id: number, data: UpdateConversationRequest): Promise<ConversationDTO> {
  return apiClient.patch<ConversationDTO>(`/api/v1/chat/conversations/${id}`, data);
}

export async function deleteConversation(id: number): Promise<void> {
  await apiClient.delete(`/api/v1/chat/conversations/${id}`);
}

export async function getMessages(conversationId: number, page = 1, pageSize = 50): Promise<PageResult<ChatTurnDTO>> {
  const result = await apiClient.get<BackendPageResult<ChatTurnDTO>>(
    `/api/v1/chat/conversations/${conversationId}/messages`,
    { page, pageSize },
  );
  return normalizePageResult(result);
}

export function toUiMessages(turns: ChatTurnDTO[]): UiChatMessage[] {
  return turns.flatMap((turn) => {
    const query = turn.query ?? '';
    const answer = turn.answer ?? '';
    const messages: UiChatMessage[] = [];

    if (query.trim().length > 0) {
      messages.push({
        id: `${turn.id}:user`,
        role: 'user',
        content: query,
        createdAt: turn.createdAt,
      });
    }

    if (answer.trim().length > 0 || turn.status === 'failed') {
      messages.push({
        id: `${turn.id}:assistant`,
        role: 'assistant',
        content: answer.trim().length > 0 ? answer : '本轮回答生成失败。',
        configId: turn.configId,
        modelName: turn.modelName,
        status: turn.status,
        createdAt: turn.createdAt,
        references: turn.references ?? [],
      });
    }

    return messages;
  });
}
