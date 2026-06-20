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

// Lazy-load public pages (welcome page is ~1600 lines with heavy animations)
const WelcomePage = lazy(() => import('@/pages/welcome'));
const BlogsPage = lazy(() => import('@/pages/blogs'));
const BlogDetailPage = lazy(() => import('@/pages/blogs/BlogDetail'));
const FeedbackPage = lazy(() => import('@/pages/feedback'));

const CreatorLayout = lazy(() => import('@/layouts/CreatorLayout').then((m) => ({ default: m.CreatorLayout })));
const CreatorBlogsPage = lazy(() => import('@/pages/creator/blogs'));
const CreatorBlogEditor = lazy(() => import('@/pages/creator/blogs/editor'));

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
      className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-bg-base text-text-main'}`}
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
            <Route index element={<WelcomePage />} />
            <Route path={RoutePaths.Blogs} element={<BlogsPage />} />
            <Route path={RoutePaths.BlogDetail} element={<BlogDetailPage />} />
            <Route path={RoutePaths.Feedback} element={<FeedbackPage />} />

            {/* Creator Routes */}
            {user && (
              <>
                <Route path="/creator" element={<CreatorLayout />}>
                  <Route index element={<Navigate to="/creator/blogs" replace />} />
                  <Route path="blogs" element={<CreatorBlogsPage />} />
                </Route>
                <Route path="/creator/blogs/edit/:id" element={<CreatorBlogEditor />} />
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
