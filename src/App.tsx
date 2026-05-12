import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { Group, Panel } from 'react-resizable-panels';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
import UsagePage from '@/pages/usage';
import LLMPage from '@/pages/settings/llm-config';
import ProfilePage from '@/pages/settings/profile';

function RightPanel({ darkMode, collapsed, onToggle }: { darkMode: boolean; collapsed: boolean; onToggle: () => void }) {
  return (
    <aside className={`h-full flex shrink-0 flex-col backdrop-blur-md border rounded-3xl overflow-hidden relative transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-[240px]'} ${darkMode ? 'bg-[#2d2d2d] border-[#3c3c3c]' : 'bg-white/40 border-border-subtle'}`}>
        {collapsed ? (
          <div className="flex h-full flex-col items-center justify-end px-0 py-4">
            <button
              onClick={onToggle}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${darkMode ? 'text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]' : 'text-text-main/45 hover:bg-primary/5 hover:text-primary'}`}
              title="展开右侧栏"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        ) : (
          <>
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
        <div className="flex shrink-0 justify-center px-4 py-4">
          <button
            onClick={onToggle}
            className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors ${darkMode ? 'text-[#858585] hover:bg-[#3c3c3c] hover:text-[#cccccc]' : 'text-text-main/45 hover:bg-primary/5 hover:text-primary'}`}
            title="收起右侧栏"
          >
            <ChevronRight size={18} />
          </button>
        </div>
          </>
        )}
      </aside>
  );
}

function ProtectedAppShell({ darkMode, setDarkMode }: { darkMode: boolean; setDarkMode: (value: boolean, origin?: { x: number; y: number }) => void }) {
  const location = useLocation();
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const isChatDetailPage = /^\/chats\/\d+$/.test(location.pathname);

  return (
    <div className={`flex h-screen font-sans overflow-hidden p-4 gap-4 ${darkMode ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-bg-base text-text-main'}`}>
      {!isChatDetailPage && <Sidebar darkMode={darkMode} onDarkModeChange={setDarkMode} />}

      <Group direction="horizontal" className="flex-1 min-w-0">
        <Panel defaultSize={isChatDetailPage ? 100 : 80} minSize={50}>
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={`${location.pathname}${location.search}`}
              className="h-full min-w-0"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              <Routes location={location}>
                <Route path={RoutePaths.Home} element={<HomePage darkMode={darkMode} />} />
                <Route path={RoutePaths.Datasets} element={<DatasetsPage darkMode={darkMode} />} />
                <Route path={RoutePaths.DatasetDetail} element={<DatasetPage darkMode={darkMode} />} />
                <Route path={RoutePaths.Chats} element={<ChatsPage darkMode={darkMode} />} />
                <Route path={RoutePaths.ChatDetail} element={<ChatPage darkMode={darkMode} />} />
                <Route path={RoutePaths.Files} element={<FilesPage darkMode={darkMode} />} />
                <Route path={RoutePaths.Usage} element={<UsagePage darkMode={darkMode} />} />
                <Route path={RoutePaths.LLMPage} element={<LLMPage darkMode={darkMode} />} />
                <Route path={RoutePaths.ProfilePage} element={<ProfilePage darkMode={darkMode} />} />
                <Route path={RoutePaths.Welcome} element={<Navigate to={RoutePaths.Home} replace />} />
                <Route path="*" element={<Navigate to={RoutePaths.Home} replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </Panel>

      </Group>
      {!isChatDetailPage && (
        <RightPanel
          darkMode={darkMode}
          collapsed={rightPanelCollapsed}
          onToggle={() => setRightPanelCollapsed((value) => !value)}
        />
      )}
    </div>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <ToastProvider>
      <AppContent
        darkMode={darkMode}
        setDarkMode={(nextDarkMode) => {
          setDarkMode(nextDarkMode);
        }}
      />
      <ToastContainer />
    </ToastProvider>
  );
}

function AppContent({ darkMode, setDarkMode }: { darkMode: boolean; setDarkMode: (value: boolean, origin?: { x: number; y: number }) => void }) {
  const { addToast } = useToast();
  const { user, loading } = useAuth();

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
      <Route index element={<WelcomePage darkMode={darkMode} />} />
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
  );
}

export default App;
