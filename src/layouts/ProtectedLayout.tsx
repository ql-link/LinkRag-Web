import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Sidebar } from '@/components/Sidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuth } from '@/contexts/AuthContext';
import { ChatWorkspaceContext, type ChatWorkspaceSnapshot } from '@/contexts/chatWorkspace';
import { getCachedConversations, setCachedConversations, clearConversationsCache } from '@/lib/conversationsCache';
import { deleteConversation, getConversations, updateConversation } from '@/services/chat';
import type { ConversationDTO } from '@/types/api';
import { Routes as RoutePaths } from '@/routes';
import { DesktopOnlyRoute } from '@/components/DesktopOnlyRoute';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { preloadProviderIcons } from '@/lib/provider-icons';
import { MobileAppShell } from './MobileAppShell';

// Lazy-loaded page components for code splitting
const HomePage = lazy(() => import('@/pages/home'));
const DatasetsPage = lazy(() => import('@/pages/datasets'));
const DatasetPage = lazy(() => import('@/pages/datasets/dataset'));
const DatasetParseConfigPage = lazy(() => import('@/pages/datasets/parse-config'));
const ChatsPage = lazy(() => import('@/pages/chats'));
const ChatPage = lazy(() => import('@/pages/chats/chat'));
const BlogsPage = lazy(() => import('@/pages/blogs'));
const FeedbackPage = lazy(() => import('@/pages/feedback'));
const UsagePage = lazy(() => import('@/pages/usage'));
const LLMPage = lazy(() => import('@/pages/settings/llm-config'));
const ProfilePage = lazy(() => import('@/pages/settings/profile'));
const AdminPage = lazy(() => import('@/pages/settings/admin'));

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center text-text-tertiary">
      <span className="text-xs uppercase tracking-[0.2em]">加载中...</span>
    </div>
  );
}

const pageMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.22, ease: 'easeOut' } as const,
};
function AppRoutesContent({ isDesktop, location }: { isDesktop: boolean; location: ReturnType<typeof useLocation> }) {
  const defaultRoute = isDesktop ? RoutePaths.Home : RoutePaths.Chats;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes location={location}>
        <Route path={RoutePaths.Home} element={isDesktop ? <HomePage /> : <Navigate to={RoutePaths.Chats} replace />} />
        <Route path={RoutePaths.Datasets} element={<DatasetsPage />} />
        <Route path={RoutePaths.DatasetParseConfig} element={<DatasetParseConfigPage />} />
        <Route path={RoutePaths.DatasetDetail} element={<DatasetPage />} />
        <Route path={RoutePaths.Chats} element={<ChatsPage />} />
        <Route path={RoutePaths.ChatDetail} element={<ChatPage />} />
        <Route path="/files" element={<Navigate to={RoutePaths.Datasets} replace />} />
        <Route path={RoutePaths.Blogs} element={<BlogsPage />} />
        <Route path={RoutePaths.Feedback} element={<FeedbackPage />} />
        <Route path={RoutePaths.Usage} element={<UsagePage />} />
        <Route path={RoutePaths.LLMPage} element={<LLMPage />} />
        <Route path={RoutePaths.ProfilePage} element={<ProfilePage />} />
        <Route
          path={RoutePaths.AdminPage}
          element={
            <DesktopOnlyRoute>
              <AdminPage />
            </DesktopOnlyRoute>
          }
        />
        <Route path={RoutePaths.Welcome} element={<Navigate to={defaultRoute} replace />} />
        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
    </Suspense>
  );
}

function ChatWorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isChatRoute = pathname === RoutePaths.Chats || pathname.startsWith(`${RoutePaths.Chats}/`);

  // ChatsPage 发布的完整交互快照（仅在对话路由挂载时有值）。
  const [liveSnapshot, setLiveSnapshot] = useState<ChatWorkspaceSnapshot | null>(null);

  // 全局只读会话列表：对话页由 ChatsPage 拥有数据，离开对话页时在此兜底拉取，
  // 保证侧栏「对话记录」在所有页面都有数据可显示。
  const [conversations, setConversations] = useState<ConversationDTO[]>(() => getCachedConversations(user?.id) ?? []);
  const [loading, setLoading] = useState(() => getCachedConversations(user?.id) === null);

  useEffect(() => {
    if (!user || isChatRoute) return;
    let cancelled = false;
    const cached = getCachedConversations(user.id);
    if (cached) setConversations(cached);
    setLoading(cached === null);
    void getConversations(1, 100)
      .then((result) => {
        if (cancelled) return;
        setConversations(result.items);
        setCachedConversations(user.id, result.items);
      })
      .catch((error) => {
        if (!cancelled) console.error('Failed to load conversations:', error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, isChatRoute]);

  const fallbackSnapshot = useMemo<ChatWorkspaceSnapshot>(
    () => ({
      conversations,
      activeConversationId: null,
      streamingConversationId: null,
      loadingConversations: loading && conversations.length === 0,
      // 非对话页发起「新建」时跳转到对话页，由 ChatsPage 负责真正建立新会话。
      onBeginNewConversation: () => navigate(RoutePaths.Chats),
      onDeleteConversation: async (id) => {
        await deleteConversation(id);
        setConversations((prev) => {
          const next = prev.filter((item) => item.id !== id);
          setCachedConversations(user?.id, next);
          return next;
        });
      },
      onRenameConversation: async (id, title) => {
        const updated = await updateConversation(id, { title });
        setConversations((prev) => {
          const next = prev.map((item) => (item.id === id ? updated : item));
          setCachedConversations(user?.id, next);
          return next;
        });
      },
    }),
    [conversations, loading, navigate, user?.id],
  );

  // 对话路由优先用 ChatsPage 的实时快照；其余页面用全局兜底快照。
  const snapshot = isChatRoute ? (liveSnapshot ?? fallbackSnapshot) : fallbackSnapshot;
  const value = useMemo(() => ({ snapshot, publish: setLiveSnapshot }), [snapshot]);
  // 登录态结束（本 Provider 仅在已登录的 ProtectedLayout 内渲染）时清空会话缓存，避免跨用户串号。
  useEffect(() => () => clearConversationsCache(), []);
  return <ChatWorkspaceContext.Provider value={value}>{children}</ChatWorkspaceContext.Provider>;
}

export function ProtectedLayout() {
  const location = useLocation();
  const isDesktop = useIsDesktop();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pageKey = location.pathname.startsWith(`${RoutePaths.Chats}/`)
    ? RoutePaths.Chats
    : `${location.pathname}${location.search}`;

  useEffect(() => {
    preloadProviderIcons();
  }, []);

  const content = (
    <ErrorBoundary>
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={pageKey}
          className="h-full min-w-0 overflow-hidden"
          initial={pageMotion.initial}
          animate={pageMotion.animate}
          exit={pageMotion.exit}
          transition={pageMotion.transition}
        >
          <AppRoutesContent isDesktop={isDesktop} location={location} />
        </motion.div>
      </AnimatePresence>
    </ErrorBoundary>
  );

  // 移动端（<1024px）：Gemini 式外壳（顶栏 + 左抽屉 + 右头像面板，无底部 tab）
  if (!isDesktop) {
    return (
      <ChatWorkspaceProvider>
        <MobileAppShell>{content}</MobileAppShell>
      </ChatWorkspaceProvider>
    );
  }

  // 桌面端（≥1024px）：侧栏悬浮在页面内，主内容不再使用卡片边框。
  return (
    <ChatWorkspaceProvider>
      <div className="relative flex h-screen min-h-0 gap-4 overflow-hidden bg-bg-base p-3 font-sans text-text-main">
        <div
          className={cn(
            'relative h-full shrink-0 transition-[width] duration-[140ms] ease-out',
            sidebarCollapsed ? 'w-[72px]' : 'w-[224px]',
          )}
        >
          <Sidebar onCollapsedChange={setSidebarCollapsed} className="absolute inset-y-0 left-0" />
        </div>
        <main className="min-h-0 flex-1 overflow-hidden">{content}</main>
      </div>
    </ChatWorkspaceProvider>
  );
}
