import { createContext, useContext } from 'react';
import type { ConversationDTO } from '@/types/api';

/**
 * 对话页向全局侧栏发布的会话历史快照。ChatsPage 仍是数据归属方，
 * 仅把渲染「最近对话」列表所需的数据与回调通过 context 发布给 Sidebar 读取，
 * 避免把整页状态上提，保持改动面最小。
 */
export interface ChatWorkspaceSnapshot {
  conversations: ConversationDTO[];
  activeConversationId: number | null;
  loadingConversations: boolean;
  onBeginNewConversation: () => void;
  onDeleteConversation: (id: number) => void;
}

interface ChatWorkspaceContextValue {
  snapshot: ChatWorkspaceSnapshot | null;
  publish: (snapshot: ChatWorkspaceSnapshot | null) => void;
}

export const ChatWorkspaceContext = createContext<ChatWorkspaceContextValue | null>(null);

/** Sidebar 侧读取当前会话历史快照（无 Provider 或非对话页时为 null）。 */
export function useChatWorkspaceSnapshot(): ChatWorkspaceSnapshot | null {
  return useContext(ChatWorkspaceContext)?.snapshot ?? null;
}

/** ChatsPage 侧发布快照；无 Provider 时返回 null。 */
export function usePublishChatWorkspace(): ((snapshot: ChatWorkspaceSnapshot | null) => void) | null {
  return useContext(ChatWorkspaceContext)?.publish ?? null;
}
