import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Sidebar } from '@/components/Sidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ChatWorkspaceContext, type ChatWorkspaceSnapshot } from '@/contexts/chatWorkspace';
import { clearConversationsCache } from '@/lib/conversationsCache';
import { Routes as RoutePaths } from '@/routes';
import { DesktopOnlyRoute } from '@/components/DesktopOnlyRoute';
import { useIsDesktop } from '@/hooks/useMediaQuery';
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

function AppRoutesContent({ location }: { location: ReturnType<typeof useLocation> }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes location={location}>
        <Route path={RoutePaths.Home} element={<HomePage />} />
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
        <Route path={RoutePaths.Welcome} element={<Navigate to={RoutePaths.Home} replace />} />
        <Route path="*" element={<Navigate to={RoutePaths.Home} replace />} />
      </Routes>
    </Suspense>
  );
}

function ChatWorkspaceProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<ChatWorkspaceSnapshot | null>(null);
  const value = useMemo(() => ({ snapshot, publish: setSnapshot }), [snapshot]);
  // 登录态结束（本 Provider 仅在已登录的 ProtectedLayout 内渲染）时清空会话缓存，避免跨用户串号。
  useEffect(() => () => clearConversationsCache(), []);
  return <ChatWorkspaceContext.Provider value={value}>{children}</ChatWorkspaceContext.Provider>;
}

export function ProtectedLayout() {
  const location = useLocation();
  const isDesktop = useIsDesktop();

  const content = (
    <ErrorBoundary>
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={`${location.pathname}${location.search}`}
          className="h-full min-w-0 overflow-hidden"
          initial={pageMotion.initial}
          animate={pageMotion.animate}
          exit={pageMotion.exit}
          transition={pageMotion.transition}
        >
          <AppRoutesContent location={location} />
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

  // 桌面端（≥1024px）：保持原侧边栏 + 主内容布局
  return (
    <ChatWorkspaceProvider>
      <div className="relative flex h-screen min-h-0 overflow-hidden bg-bg-base font-sans text-text-main">
        <Sidebar />
        <main className="min-h-0 flex-1 overflow-hidden rounded-l-[24px] border-l border-white/60 bg-bg-card shadow-sm backdrop-blur-xl">
          {content}
        </main>
      </div>
    </ChatWorkspaceProvider>
  );
}
