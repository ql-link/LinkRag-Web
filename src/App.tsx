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
const FeedbackPage = lazy(() => import('@/pages/feedback'));

function AppContent() {
  const { addToast } = useToast();
  const { user, loading } = useAuth();
  const { darkMode } = useTheme();
  const location = useLocation();

  useEffect(() => {
    setToastHandler(addToast);
  }, [addToast]);

  const loadingView = (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-bg-base text-text-main'}`}>
      <div className="text-sm uppercase tracking-[0.3em]">Loading LinkRag...</div>
    </div>
  );

  return (
    <Suspense fallback={loadingView}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          className="min-h-screen"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <Routes location={location}>
            <Route index element={<WelcomePage />} />
            <Route path={RoutePaths.Blogs} element={<BlogsPage />} />
            <Route path={RoutePaths.Feedback} element={<FeedbackPage />} />
            <Route
              path="*"
              element={
                loading
                  ? loadingView
                  : user
                    ? <ProtectedLayout />
                    : <Navigate to={RoutePaths.Welcome} replace />
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
