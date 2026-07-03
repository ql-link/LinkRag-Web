import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Routes as RoutePaths } from './routes';
import { ToastContainer, ToastProvider, useToast } from '@/contexts/ToastContext';
import { setToastHandler } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocation } from 'react-router';
import { ProtectedLayout } from '@/layouts/ProtectedLayout';
import { DesktopOnlyRoute } from '@/components/DesktopOnlyRoute';
import { useIsDesktop } from '@/hooks/useMediaQuery';

// Lazy-load public pages (welcome page is ~1600 lines with heavy animations)
const WelcomePage = lazy(() => import('@/pages/welcome'));
const MobileAuthPage = lazy(() => import('@/pages/mobile/MobileAuth'));
const BlogsPage = lazy(() => import('@/pages/blogs'));
const BlogDetailPage = lazy(() => import('@/pages/blogs/BlogDetail'));
const FeedbackPage = lazy(() => import('@/pages/feedback'));

const AdminLayout = lazy(() => import('@/layouts/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminModelsPage = lazy(() => import('@/pages/admin/models'));
const AdminLogsPage = lazy(() => import('@/pages/admin/logs'));
const CreatorLayout = lazy(() => import('@/layouts/CreatorLayout').then((m) => ({ default: m.CreatorLayout })));
const CreatorBlogsPage = lazy(() => import('@/pages/creator/blogs'));
const CreatorBlogEditor = lazy(() => import('@/pages/creator/blogs/editor'));

// 根路由 `/`：移动端（<1024px）显示登录/注册页并在登录后进入对话；桌面端保持原欢迎落地页。
function RootRoute() {
  const isDesktop = useIsDesktop();
  const { user } = useAuth();
  if (user) {
    return <Navigate to={isDesktop ? RoutePaths.Home : RoutePaths.Chats} replace />;
  }
  return isDesktop ? <WelcomePage /> : <MobileAuthPage />;
}

function isProtectedAppPath(pathname: string) {
  return (
    pathname.startsWith(RoutePaths.Home) ||
    pathname.startsWith(RoutePaths.Datasets) ||
    pathname.startsWith(RoutePaths.Chats) ||
    pathname.startsWith(RoutePaths.Usage) ||
    pathname.startsWith(RoutePaths.Settings)
  );
}

function AppContent() {
  const { addToast } = useToast();
  const { user, loading } = useAuth();
  const { darkMode } = useTheme();
  const location = useLocation();

  useEffect(() => {
    setToastHandler(addToast);
  }, [addToast]);

  const loadingView = (
    <div
      className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#1f1f1f] text-[#d6d6d6]' : 'bg-bg-base text-text-main'}`}
    >
      <div className="text-sm uppercase tracking-[0.3em]">Loading LinkRag...</div>
    </div>
  );
  const shellKey = user && isProtectedAppPath(location.pathname) ? 'protected-app' : location.pathname;

  return (
    <Suspense fallback={loadingView}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={shellKey}
          className="min-h-screen"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <Routes location={location}>
            <Route index element={<RootRoute />} />
            <Route path={RoutePaths.Blogs} element={<BlogsPage />} />
            <Route path={RoutePaths.BlogDetail} element={<BlogDetailPage />} />
            <Route path={RoutePaths.Feedback} element={<FeedbackPage />} />

            {/* Creator Routes */}
            {user?.role === 'ADMIN' && (
              <>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="/admin/blogs" replace />} />
                  <Route path="blogs" element={<CreatorBlogsPage />} />
                  <Route
                    path="models"
                    element={
                      <DesktopOnlyRoute>
                        <AdminModelsPage />
                      </DesktopOnlyRoute>
                    }
                  />
                  <Route
                    path="logs"
                    element={
                      <DesktopOnlyRoute>
                        <AdminLogsPage />
                      </DesktopOnlyRoute>
                    }
                  />
                </Route>
                <Route
                  path="/admin/blogs/edit/:id"
                  element={
                    <DesktopOnlyRoute>
                      <CreatorBlogEditor />
                    </DesktopOnlyRoute>
                  }
                />
                <Route path="/creator" element={<CreatorLayout />}>
                  <Route index element={<Navigate to="/creator/blogs" replace />} />
                  <Route path="blogs" element={<CreatorBlogsPage />} />
                </Route>
                <Route
                  path="/creator/blogs/edit/:id"
                  element={
                    <DesktopOnlyRoute>
                      <CreatorBlogEditor />
                    </DesktopOnlyRoute>
                  }
                />
              </>
            )}

            <Route
              path="*"
              element={
                loading ? loadingView : user ? <ProtectedLayout /> : <Navigate to={RoutePaths.Welcome} replace />
              }
            />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </Suspense>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
      <ToastContainer />
    </ToastProvider>
  );
}

export default App;
