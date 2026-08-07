import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { Routes as RoutePaths } from './routes';
import { ToastContainer, ToastProvider, useToast } from '@/contexts/ToastContext';
import { setToastHandler } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocation } from 'react-router';
import { ProtectedLayout } from '@/layouts/ProtectedLayout';
import { DesktopOnlyRoute } from '@/components/DesktopOnlyRoute';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { fluidEnterTransition } from '@/lib/fluid-motion';

// Lazy-load public pages (welcome page is ~1600 lines with heavy animations)
const WelcomePage = lazy(() => import('@/pages/welcome'));
const AuthPage = lazy(() => import('@/pages/auth'));
const BlogsPage = lazy(() => import('@/pages/blogs'));
const BlogDetailPage = lazy(() => import('@/pages/blogs/BlogDetail'));
const FeedbackPage = lazy(() => import('@/pages/feedback'));

const AdminLayout = lazy(() => import('@/layouts/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminLoginPage = lazy(() => import('@/pages/admin/login'));
const AdminModelsPage = lazy(() => import('@/pages/admin/models'));
const AdminLogsPage = lazy(() => import('@/pages/admin/logs'));
const AdminUsersPage = lazy(() => import('@/pages/admin/users'));
const CreatorBlogsPage = lazy(() => import('@/pages/creator/blogs'));
const CreatorBlogEditor = lazy(() => import('@/pages/creator/blogs/editor'));

// 根路由 `/` 只承载产品落地页；认证流程使用独立的 `/login` 与 `/register` 路由。
function RootRoute() {
  const isDesktop = useIsDesktop();
  const { user } = useAuth();
  if (user) {
    return <Navigate to={isDesktop ? RoutePaths.Home : RoutePaths.Chats} replace />;
  }
  return <WelcomePage />;
}

function AuthRoute({ mode }: { mode: 'login' | 'register' }) {
  const isDesktop = useIsDesktop();
  const { user } = useAuth();

  if (user) {
    return <Navigate to={isDesktop ? RoutePaths.Home : RoutePaths.Chats} replace />;
  }

  return <AuthPage mode={mode} />;
}

function AdminLoginRoute({ loadingView }: { loadingView: ReactNode }) {
  const { admin, loading } = useAdminAuth();
  if (loading) return loadingView;
  if (admin) return <Navigate to={RoutePaths.AdminUsers} replace />;
  return <AdminLoginPage />;
}

function AdminAccessRoute({ loadingView }: { loadingView: ReactNode }) {
  const { admin, loading } = useAdminAuth();
  if (loading) return loadingView;
  if (!admin) return <Navigate to={RoutePaths.AdminLogin} replace />;
  return <Outlet />;
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
  const reducedMotion = useReducedMotion();

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
          className="fluid-compositor min-h-screen"
          initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : -6 }}
          transition={fluidEnterTransition(reducedMotion)}
        >
          <Routes location={location}>
            <Route index element={<RootRoute />} />
            <Route path={RoutePaths.Login} element={<AuthRoute mode="login" />} />
            <Route path={RoutePaths.Register} element={<AuthRoute mode="register" />} />
            <Route path={RoutePaths.Blogs} element={<BlogsPage />} />
            <Route path={RoutePaths.BlogDetail} element={<BlogDetailPage />} />
            <Route path={RoutePaths.Feedback} element={<FeedbackPage />} />

            {/* 管理端使用独立登录态与固定路由树，不依赖 C 端账号状态。 */}
            <Route path={RoutePaths.AdminLogin} element={<AdminLoginRoute loadingView={loadingView} />} />
            <Route path={RoutePaths.AdminRoot} element={<AdminAccessRoute loadingView={loadingView} />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Navigate to={RoutePaths.AdminUsers} replace />} />
                <Route path="users" element={<AdminUsersPage />} />
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
                path="blogs/edit/:id"
                element={
                  <DesktopOnlyRoute>
                    <CreatorBlogEditor />
                  </DesktopOnlyRoute>
                }
              />
              <Route path="*" element={<Navigate to={RoutePaths.AdminUsers} replace />} />
            </Route>

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
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <AppContent />
        <ToastContainer />
      </ToastProvider>
    </MotionConfig>
  );
}

export default App;
