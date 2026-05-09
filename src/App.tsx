import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import { Routes as RoutePaths } from './routes';
import { ToastContainer, ToastProvider, useToast } from '@/contexts/ToastContext';
import { setToastHandler } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import HomePage from '@/pages/home';
import WelcomePage from '@/pages/welcome';
import DatasetsPage from '@/pages/datasets';
import DatasetPage from '@/pages/datasets/dataset';
import ChatsPage from '@/pages/chats';
import ChatPage from '@/pages/chats/chat';
import FilesPage from '@/pages/files';
import BlogsPage from '@/pages/blogs';
import LLMPage from '@/pages/settings/llm-config';
import ProfilePage from '@/pages/settings/profile';

function ResizeHandle() {
  return (
    <Separator className="w-1.5 flex items-center justify-center group transition-all rounded-full hover:bg-primary/10">
      <div className="w-0.5 h-8 bg-border-subtle group-hover:bg-primary rounded-full transition-colors" />
    </Separator>
  );
}

function RightPanel({ darkMode }: { darkMode: boolean }) {
  return (
    <Panel defaultSize={20} minSize={15}>
      <aside className={`h-full flex flex-col backdrop-blur-md border rounded-3xl overflow-hidden relative ${darkMode ? 'bg-[#2d2d2d] border-[#3c3c3c]' : 'bg-white/40 border-border-subtle'}`}>
        <div className="flex-1 min-h-0 flex flex-col">
          <div className={`p-6 pb-2 flex justify-between items-center shrink-0 ${darkMode ? 'bg-[#252526]' : 'bg-white/20'}`}>
            <span className={`mono-label ${darkMode ? 'text-[#858585]' : ''}`}>最近活动</span>
          </div>
          <div className="flex-1 p-4 pt-0 overflow-y-auto">
            <div className="space-y-3">
              <div className={`rounded-xl p-3 ${darkMode ? 'bg-[#2d2d2d] border border-[#3c3c3c]' : 'art-card'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-[#e0e0e0]' : ''}`}>欢迎进入 LinkRag</p>
                <p className={`mono-label ${darkMode ? 'text-[#858585]' : ''}`}>前后端联调版工作台</p>
              </div>
              <div className={`rounded-xl p-3 ${darkMode ? 'bg-[#2d2d2d] border border-[#3c3c3c]' : 'art-card'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-[#e0e0e0]' : ''}`}>知识库、文件、对话</p>
                <p className={`mono-label ${darkMode ? 'text-[#858585]' : ''}`}>已接入当前可用后端接口</p>
              </div>
              <div className={`rounded-xl p-3 ${darkMode ? 'bg-[#2d2d2d] border border-[#3c3c3c]' : 'art-card'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-[#e0e0e0]' : ''}`}>欢迎页已启用</p>
                <p className={`mono-label ${darkMode ? 'text-[#858585]' : ''}`}>退出登录会自动返回入口页</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`h-[30%] flex flex-col shrink-0 ${darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-bg-base/20 border-border-subtle'}`}>
          <div className={`p-4 shrink-0 ${darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/10 border-border-subtle'}`}>
            <span className={`mono-label ${darkMode ? 'text-[#858585]' : ''}`}>工作台状态</span>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'Auth', label: '欢迎入口' },
                { value: 'Files', label: '文件链路' },
                { value: 'Chats', label: '会话历史' },
                { value: 'Docs', label: '缺口文档' },
              ].map((stat) => (
                <div key={stat.label} className={`rounded-xl p-3 text-center ${darkMode ? 'bg-[#2d2d2d] border border-[#3c3c3c]' : 'art-card'}`}>
                  <div className={`text-lg font-bold ${darkMode ? 'text-[#e0e0e0]' : ''}`}>{stat.value}</div>
                  <div className={`mono-label text-[8px] ${darkMode ? 'text-[#858585]' : ''}`}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </Panel>
  );
}

function ProtectedAppShell({ darkMode, setDarkMode }: { darkMode: boolean; setDarkMode: (value: boolean) => void }) {
  return (
    <div className={`flex h-screen font-sans overflow-hidden p-4 gap-4 ${darkMode ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-bg-base text-text-main'}`}>
      <Sidebar darkMode={darkMode} onDarkModeChange={setDarkMode} />

      <Group direction="horizontal" className="flex-1 min-w-0">
        <Panel defaultSize={80} minSize={50}>
          <Routes>
            <Route path={RoutePaths.Home} element={<HomePage darkMode={darkMode} />} />
            <Route path={RoutePaths.Datasets} element={<DatasetsPage darkMode={darkMode} />} />
            <Route path={RoutePaths.DatasetDetail} element={<DatasetPage darkMode={darkMode} />} />
            <Route path={RoutePaths.Chats} element={<ChatsPage darkMode={darkMode} />} />
            <Route path={RoutePaths.ChatDetail} element={<ChatPage darkMode={darkMode} />} />
            <Route path={RoutePaths.Files} element={<FilesPage darkMode={darkMode} />} />
            <Route path={RoutePaths.LLMPage} element={<LLMPage darkMode={darkMode} />} />
            <Route path={RoutePaths.ProfilePage} element={<ProfilePage darkMode={darkMode} />} />
            <Route path={RoutePaths.Welcome} element={<Navigate to={RoutePaths.Home} replace />} />
            <Route path="*" element={<Navigate to={RoutePaths.Home} replace />} />
          </Routes>
        </Panel>

        <ResizeHandle />
        <RightPanel darkMode={darkMode} />
      </Group>
    </div>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <ToastProvider>
      <AppContent darkMode={darkMode} setDarkMode={setDarkMode} />
      <ToastContainer />
    </ToastProvider>
  );
}

function RouteTransition({ children }: { children: ReactNode; key?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="min-h-screen"
      initial={{ opacity: reduceMotion ? 1 : 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: reduceMotion ? 1 : 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function AppContent({ darkMode, setDarkMode }: { darkMode: boolean; setDarkMode: (value: boolean) => void }) {
  const { addToast } = useToast();
  const { user, loading } = useAuth();
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
    <AnimatePresence mode="wait" initial={false}>
      <RouteTransition key={location.pathname}>
        <Routes location={location}>
          <Route path={RoutePaths.Blogs} element={<BlogsPage darkMode={darkMode} />} />
          <Route
            index
            element={loading ? loadingView : <WelcomePage darkMode={darkMode} />}
          />
          <Route
            path="*"
            element={
              loading
                ? loadingView
                : user
                  ? <ProtectedAppShell darkMode={darkMode} setDarkMode={setDarkMode} />
                  : <Navigate to={RoutePaths.Welcome} replace />
            }
          />
        </Routes>
      </RouteTransition>
    </AnimatePresence>
  );
}

export default App;
