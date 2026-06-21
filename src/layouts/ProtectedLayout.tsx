import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Routes as RoutePaths } from '@/routes';
import { MobileNav } from './MobileNav';

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

function getPageTitle(pathname: string) {
  if (pathname === RoutePaths.Home) return '首页';
  if (pathname.startsWith('/datasets')) return '知识库';
  if (pathname.startsWith('/chats')) return '对话';
  if (pathname.startsWith('/blogs')) return '博客';
  if (pathname.startsWith('/feedback')) return '反馈';
  if (pathname.startsWith('/usage')) return '用量';
  if (pathname.startsWith('/settings/llm-config')) return '模型配置';
  if (pathname.startsWith('/settings/profile')) return '个人信息';
  if (pathname.startsWith('/settings/admin')) return '后台管理';
  return 'LinkRag';
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
        <Route path={RoutePaths.AdminPage} element={<AdminPage />} />
        <Route path={RoutePaths.Welcome} element={<Navigate to={RoutePaths.Home} replace />} />
        <Route path="*" element={<Navigate to={RoutePaths.Home} replace />} />
      </Routes>
    </Suspense>
  );
}

export function ProtectedLayout() {
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pageTitle = getPageTitle(location.pathname);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-bg-base font-sans text-text-main lg:flex-row">
      {/* Mobile Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle px-3 lg:hidden">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-primary/8"
          aria-label="打开导航栏"
        >
          <Menu size={18} />
        </button>
        <p className="text-sm font-medium tracking-wide text-text-main">{pageTitle}</p>
        <span className="h-9 w-9" aria-hidden />
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.button
              className="fixed inset-0 z-40 bg-ink/30 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="关闭导航遮罩"
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 w-[min(82vw,300px)] lg:hidden"
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="absolute right-3 top-4 z-10">
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-card text-text-secondary"
                  aria-label="关闭导航栏"
                >
                  <X size={16} />
                </button>
              </div>
              <Sidebar onNavigate={() => setMobileSidebarOpen(false)} allowCollapse={false} className="h-full w-full" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <Sidebar className="hidden lg:flex" />

      {/* Main Content — sits directly on the canvas, no floating card */}
      <main className="min-h-0 flex-1 overflow-hidden">
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
      </main>

      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  );
}
