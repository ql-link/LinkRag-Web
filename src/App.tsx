import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { Routes as RoutePaths } from './routes';
import { ToastContainer, ToastProvider, useToast } from '@/contexts/ToastContext';
import { setToastHandler } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ProtectedLayout } from '@/layouts/ProtectedLayout';
import WelcomePage from '@/pages/welcome';
import BlogsPage from '@/pages/blogs';
import FeedbackPage from '@/pages/feedback';

function AppContent() {
  const { addToast } = useToast();
  const { user, loading } = useAuth();
  const { darkMode } = useTheme();

  useEffect(() => {
    setToastHandler(addToast);
  }, [addToast]);

  const loadingView = (
    <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-bg-base text-text-main'}`}>
      <div className="text-sm uppercase tracking-[0.3em]">Loading LinkRag...</div>
    </div>
  );

  return (
    <Routes>
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
