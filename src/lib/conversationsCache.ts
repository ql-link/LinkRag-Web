import type { ConversationDTO } from '@/types/api';

/**
 * 「最近对话」列表的会话级内存缓存。
 * 进入对话页时先用缓存即时渲染，再后台拉取刷新（stale-while-revalidate）。
 * 仅存于内存，按 userId 作用域隔离：换用户时缓存自动失效，避免跨用户串号；
 * 退出登录时还会由 ChatWorkspaceProvider 卸载清空。
 */
let cache: { userId: number; items: ConversationDTO[] } | null = null;

export function getCachedConversations(userId: number | null | undefined): ConversationDTO[] | null {
  return cache && userId != null && cache.userId === userId ? cache.items : null;
}

export function setCachedConversations(userId: number | null | undefined, items: ConversationDTO[]): void {
  if (userId == null) return;
  cache = { userId, items };
}

export function clearConversationsCache(): void {
  cache = null;
}
