import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { Group, Panel } from 'react-resizable-panels';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Routes as RoutePaths } from '@/routes';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
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

function PageLoader() {
  const { darkMode } = useTheme();
  return (
    <div className={cn('flex h-full items-center justify-center', darkMode ? 'text-[#858585]' : 'text-text-main/40')}>
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
  return 'LinkRag';
}

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
        <Route path={RoutePaths.Welcome} element={<Navigate to={RoutePaths.Home} replace />} />
        <Route path="*" element={<Navigate to={RoutePaths.Home} replace />} />
      </Routes>
    </Suspense>
  );
}

export function ProtectedLayout() {
  const location = useLocation();
  const { darkMode, toggleTheme } = useTheme();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const pageTitle = getPageTitle(location.pathname);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div
      className={cn(
        'relative flex h-screen min-h-0 flex-col gap-2 overflow-hidden p-2 font-sans lg:flex-row lg:gap-4 lg:p-4',
        darkMode ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-bg-base text-text-main',
      )}
    >
      {/* Mobile Header */}
      <header
        className={cn(
          'flex h-14 shrink-0 items-center justify-between rounded-2xl border px-3 backdrop-blur-md lg:hidden',
          darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white/80',
        )}
      >
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg',
            darkMode ? 'text-[#cccccc] hover:bg-[#2d2d2d]' : 'text-text-main/70 hover:bg-primary/5',
          )}
          aria-label="打开导航栏"
        >
          <Menu size={18} />
        </button>
        <p className={cn('text-sm font-semibold tracking-wide', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
          {pageTitle}
        </p>
        <button
          onClick={toggleTheme}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-bold uppercase tracking-wider',
            darkMode
              ? 'text-[#858585] hover:bg-[#2d2d2d] hover:text-[#cccccc]'
              : 'text-text-main/50 hover:bg-primary/5 hover:text-primary',
          )}
          aria-label="切换主题"
        >
          {darkMode ? '浅' : '深'}
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.button
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="关闭导航遮罩"
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 w-[min(84vw,320px)] p-3 lg:hidden"
              initial={{ x: -28, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -28, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="absolute right-5 top-5 z-10">
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg',
                    darkMode ? 'bg-[#2d2d2d] text-[#cccccc]' : 'bg-white/90 text-text-main/70',
                  )}
                  aria-label="关闭导航栏"
                >
                  <X size={16} />
                </button>
              </div>
              <Sidebar
                onNavigate={() => setMobileSidebarOpen(false)}
                allowCollapse={false}
                className="h-full w-full rounded-2xl"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <Sidebar className="hidden lg:flex" />

      {/* Main Content */}
      {isMobile ? (
        <main className="flex-1 min-h-0 overflow-hidden rounded-2xl">
          <ErrorBoundary>
            <AnimatePresence mode="sync" initial={false}>
              <motion.div
                key={`${location.pathname}${location.search}`}
                className={cn(
                  'h-full min-w-0 overflow-hidden rounded-2xl border',
                  darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
                )}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
              >
                <AppRoutesContent location={location} />
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      ) : (
        <Group orientation="horizontal" className="flex-1 min-w-0">
          <Panel defaultSize={100} minSize={50}>
            <ErrorBoundary>
              <AnimatePresence mode="sync" initial={false}>
                <motion.div
                  key={`${location.pathname}${location.search}`}
                  className={cn(
                    'h-full min-w-0 overflow-hidden rounded-[24px] border',
                    darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white',
                  )}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                >
                  <AppRoutesContent location={location} />
                </motion.div>
              </AnimatePresence>
            </ErrorBoundary>
          </Panel>
        </Group>
      )}

      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  );
}
