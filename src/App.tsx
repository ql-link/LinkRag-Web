import { useEffect, useState, type CSSProperties } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router';
import { Group, Panel } from 'react-resizable-panels';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Database, FolderOpen, Home, Menu, MessageSquare, User, X } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Routes as RoutePaths } from './routes';
import { ToastContainer, ToastProvider, useToast } from '@/contexts/ToastContext';
import { setToastHandler } from '@/lib/api-client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import HomePage from '@/pages/home';
import WelcomePage from '@/pages/welcome';
import DatasetsPage from '@/pages/datasets';
import DatasetPage from '@/pages/datasets/dataset';
import ChatsPage from '@/pages/chats';
import ChatPage from '@/pages/chats/chat';
import FilesPage from '@/pages/files';
import BlogsPage from '@/pages/blogs';
import UsagePage from '@/pages/usage';
import LLMPage from '@/pages/settings/llm-config';
import ProfilePage from '@/pages/settings/profile';

type MobileTabItem = {
  path: string;
  label: string;
  icon: typeof Home;
  match?: (pathname: string) => boolean;
};

const mobileTabItems: MobileTabItem[] = [
  { path: RoutePaths.Home, label: '首页', icon: Home },
  { path: RoutePaths.Datasets, label: '知识库', icon: Database },
  { path: RoutePaths.Chats, label: '对话', icon: MessageSquare },
  { path: RoutePaths.Files, label: '文件', icon: FolderOpen },
  { path: RoutePaths.ProfilePage, label: '我的', icon: User, match: (pathname: string) => pathname.startsWith('/settings') },
] as const;

function isTabActive(pathname: string, item: MobileTabItem) {
  if (item.match) return item.match(pathname);
  return pathname === item.path;
}

function getPageTitle(pathname: string) {
  if (pathname === RoutePaths.Home) return '首页';
  if (pathname.startsWith('/datasets')) return '知识库';
  if (pathname.startsWith('/chats')) return '对话';
  if (pathname.startsWith('/files')) return '文件';
  if (pathname.startsWith('/blogs')) return '博客';
  if (pathname.startsWith('/usage')) return '用量';
  if (pathname.startsWith('/settings/llm-config')) return 'LLM 配置';
  if (pathname.startsWith('/settings/profile')) return '个人信息';
  return 'LinkRag';
}

function AppRoutesContent({ location, darkMode }: { location: ReturnType<typeof useLocation>; darkMode: boolean }) {
  return (
    <Routes location={location}>
      <Route path={RoutePaths.Home} element={<HomePage darkMode={darkMode} />} />
      <Route path={RoutePaths.Datasets} element={<DatasetsPage darkMode={darkMode} />} />
      <Route path={RoutePaths.DatasetDetail} element={<DatasetPage darkMode={darkMode} />} />
      <Route path={RoutePaths.Chats} element={<ChatsPage darkMode={darkMode} />} />
      <Route path={RoutePaths.ChatDetail} element={<ChatPage darkMode={darkMode} />} />
      <Route path={RoutePaths.Files} element={<FilesPage darkMode={darkMode} />} />
      <Route path={RoutePaths.Blogs} element={<BlogsPage darkMode={darkMode} />} />
      <Route path={RoutePaths.Usage} element={<UsagePage darkMode={darkMode} />} />
      <Route path={RoutePaths.LLMPage} element={<LLMPage darkMode={darkMode} />} />
      <Route path={RoutePaths.ProfilePage} element={<ProfilePage darkMode={darkMode} />} />
      <Route path={RoutePaths.Welcome} element={<Navigate to={RoutePaths.Home} replace />} />
      <Route path="*" element={<Navigate to={RoutePaths.Home} replace />} />
    </Routes>
  );
}

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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const isChatDetailPage = /^\/chats\/\d+$/.test(location.pathname);
  const pageTitle = getPageTitle(location.pathname);
  const bottomBarStyle: CSSProperties = { paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' };

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className={cn(
      'relative flex h-screen min-h-0 flex-col gap-2 overflow-hidden p-2 font-sans lg:flex-row lg:gap-4 lg:p-4',
      darkMode ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-bg-base text-text-main',
    )}>
      {!isChatDetailPage && (
        <header className={cn(
          'flex h-14 shrink-0 items-center justify-between rounded-2xl border px-3 backdrop-blur-md lg:hidden',
          darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white/80',
        )}>
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
          <p className={cn('text-sm font-semibold tracking-wide', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>{pageTitle}</p>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-bold uppercase tracking-wider',
              darkMode ? 'text-[#858585] hover:bg-[#2d2d2d] hover:text-[#cccccc]' : 'text-text-main/50 hover:bg-primary/5 hover:text-primary',
            )}
            aria-label="切换主题"
          >
            {darkMode ? '浅' : '深'}
          </button>
        </header>
      )}

      <AnimatePresence>
        {mobileSidebarOpen && !isChatDetailPage && (
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
                darkMode={darkMode}
                onDarkModeChange={setDarkMode}
                onNavigate={() => setMobileSidebarOpen(false)}
                allowCollapse={false}
                className="h-full w-full rounded-2xl"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {!isChatDetailPage && (
        <Sidebar
          darkMode={darkMode}
          onDarkModeChange={setDarkMode}
          className="hidden lg:flex"
        />
      )}

      {isMobile ? (
        <main className="flex-1 min-h-0 overflow-hidden rounded-2xl">
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={`${location.pathname}${location.search}`}
              className="h-full min-w-0"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              <AppRoutesContent location={location} darkMode={darkMode} />
            </motion.div>
          </AnimatePresence>
        </main>
      ) : (
        <>
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
                  <AppRoutesContent location={location} darkMode={darkMode} />
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
        </>
      )}

      {!isChatDetailPage && (
        <nav
          className={cn(
            'fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-1 border-t px-2 pt-2 lg:hidden',
            darkMode ? 'border-[#3c3c3c] bg-[#1e1e1e]/95 backdrop-blur-md' : 'border-border-subtle bg-white/95 backdrop-blur-md',
          )}
          style={bottomBarStyle}
        >
          {mobileTabItems.map((item) => {
            const Icon = item.icon;
            const active = isTabActive(location.pathname, item);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl py-2 text-[10px] font-bold uppercase tracking-wider transition-colors',
                  active
                    ? darkMode
                      ? 'bg-[#2d2d2d] text-[#f0f0f0]'
                      : 'bg-primary/10 text-primary'
                    : darkMode
                      ? 'text-[#858585]'
                      : 'text-text-main/55',
                )}
              >
                <Icon size={16} />
                <span className="mt-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>
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
      <Route path={RoutePaths.Blogs} element={<BlogsPage darkMode={darkMode} />} />
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
