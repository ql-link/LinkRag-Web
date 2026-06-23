import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  BarChart3,
  ChevronRight,
  Cpu,
  Database,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { Routes as RoutePaths } from '@/routes';
import { useAuth } from '@/contexts/AuthContext';
import { getConversations } from '@/services/chat';
import { getCachedConversations, setCachedConversations } from '@/lib/conversationsCache';
import { LinkRagMark } from '@/components/LinkRagMark';
import { cn } from '@/lib/utils';
import type { ConversationDTO } from '@/types/api';

// 抽屉底部「功能入口」（对话由顶部「新建对话」+ 历史列表承载，故此处不重复）。
const drawerNavItems = [
  { path: RoutePaths.Home, name: '首页', icon: Home },
  { path: RoutePaths.Datasets, name: '知识库', icon: Database },
  { path: RoutePaths.LLMPage, name: '模型配置', icon: Cpu },
  { path: RoutePaths.Usage, name: '用量', icon: BarChart3 },
];

function getMobileTitle(pathname: string): string {
  if (pathname === RoutePaths.Chats || pathname.startsWith(`${RoutePaths.Chats}/`)) return 'LinkRag';
  if (pathname.startsWith('/datasets')) return '知识库';
  if (pathname.startsWith('/usage')) return '用量';
  if (pathname.startsWith('/settings/llm-config')) return '模型配置';
  if (pathname.startsWith('/settings/profile')) return '个人信息';
  if (pathname.startsWith('/settings/admin')) return '后台管理';
  if (pathname === RoutePaths.Home) return '首页';
  return 'LinkRag';
}

function getUserInitial(user: ReturnType<typeof useAuth>['user']) {
  return user?.nickname?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || '';
}

/**
 * 移动端（<1024px）认证外壳：Gemini 式顶栏（左汉堡 / 中标题 / 右头像）+ 左抽屉（新建对话 /
 * 历史会话 / 功能入口）+ 右头像面板（用户信息 / 个人信息 / 退出）。无底部 tab 栏。
 */
export function MobileAppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userPanelOpen, setUserPanelOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationDTO[]>(() => getCachedConversations(user?.id) ?? []);

  const topInset: CSSProperties = { paddingTop: 'env(safe-area-inset-top)' };
  const displayName = user?.nickname || user?.username || '当前用户';
  const displayEmail = user?.email || '未设置邮箱';
  const userInitial = getUserInitial(user);

  // 路由切换时收起所有浮层
  useEffect(() => {
    setDrawerOpen(false);
    setUserPanelOpen(false);
  }, [location.pathname]);

  // 抽屉打开时刷新最近对话（先用缓存即时渲染，再后台拉取）
  useEffect(() => {
    if (!drawerOpen || !user) return;
    let cancelled = false;
    void getConversations(1, 20)
      .then((result) => {
        if (cancelled) return;
        setConversations(result.items);
        setCachedConversations(user.id, result.items);
      })
      .catch(() => {
        /* 静默失败：保留缓存内容 */
      });
    return () => {
      cancelled = true;
    };
  }, [drawerOpen, user]);

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to logout:', error);
    } finally {
      setUserPanelOpen(false);
      navigate(RoutePaths.Welcome, { replace: true });
    }
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-bg-base font-sans text-text-main">
      {/* Top bar */}
      <header
        className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border-subtle bg-canvas/88 px-2 backdrop-blur-xl"
        style={topInset}
      >
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-text-secondary hover:bg-primary/8"
          aria-label="打开菜单"
        >
          <Menu size={20} />
        </button>
        <p className="truncate text-base font-bold tracking-wide text-text-main">{getMobileTitle(location.pathname)}</p>
        <button
          onClick={() => setUserPanelOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          aria-label="打开账户"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="用户头像"
              className="h-8 w-8 rounded-full border border-hairline object-cover"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {userInitial || <User size={15} className="text-muted" />}
            </span>
          )}
        </button>
      </header>

      {/* Main content */}
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>

      {/* Left drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.button
              className="fixed inset-0 z-40 bg-ink/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              aria-label="关闭菜单遮罩"
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col border-r border-white/60 bg-bg-frosted shadow-xl backdrop-blur-xl"
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={topInset}
            >
              <div className="flex h-14 shrink-0 items-center justify-between px-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden">
                    <LinkRagMark />
                  </div>
                  <h1 className="serif-heading text-xl text-ink">LinkRag</h1>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-primary/8"
                  aria-label="关闭菜单"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                {/* 新建对话 */}
                <button
                  onClick={() => navigate(RoutePaths.Chats)}
                  className="flex w-full items-center gap-3 rounded-xl bg-primary/10 px-3 py-2.5 text-sm font-bold text-ink transition-colors hover:bg-primary/15"
                >
                  <Plus size={18} className="text-primary" />
                  新建对话
                </button>

                {/* 最近对话 */}
                <div className="mt-5">
                  <p className="mono-label mb-2 px-1">最近对话</p>
                  {conversations.length === 0 ? (
                    <p className="px-1 py-3 text-xs text-muted-soft">暂无对话记录</p>
                  ) : (
                    <div className="space-y-0.5">
                      {conversations.slice(0, 12).map((item) => {
                        const active = location.pathname === `${RoutePaths.Chats}/${item.id}`;
                        return (
                          <button
                            key={item.id}
                            onClick={() => navigate(`/chats/${item.id}`)}
                            className={cn(
                              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors',
                              active
                                ? 'bg-primary/10 text-ink'
                                : 'text-text-secondary hover:bg-primary/5 hover:text-ink',
                            )}
                          >
                            <MessageSquare size={15} className="shrink-0 text-muted" />
                            <span className="truncate text-sm">{(item.title ?? '新对话').trim() || '新对话'}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 功能入口 */}
                <div className="mt-5 border-t border-border-subtle pt-4">
                  <p className="mono-label mb-2 px-1">功能</p>
                  <div className="space-y-0.5">
                    {drawerNavItems.map(({ path, name, icon: Icon }) => {
                      const active =
                        location.pathname === path ||
                        (path !== RoutePaths.Home && location.pathname.startsWith(`${path}/`));
                      return (
                        <button
                          key={path}
                          onClick={() => navigate(path)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                            active ? 'bg-primary/10 text-ink' : 'text-text-secondary hover:bg-primary/5 hover:text-ink',
                          )}
                        >
                          <Icon size={18} className={cn('shrink-0', active ? 'text-primary' : 'text-muted')} />
                          <span className="text-sm font-medium">{name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Right account panel */}
      <AnimatePresence>
        {userPanelOpen && (
          <>
            <motion.button
              className="fixed inset-0 z-40 bg-ink/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUserPanelOpen(false)}
              aria-label="关闭账户遮罩"
            />
            <motion.div
              className="fixed inset-y-0 right-0 z-50 flex w-[min(86vw,320px)] flex-col border-l border-white/60 bg-bg-frosted shadow-xl backdrop-blur-xl"
              initial={{ x: 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 24, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={topInset}
            >
              <div className="flex h-14 shrink-0 items-center justify-end px-2">
                <button
                  onClick={() => setUserPanelOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-primary/8"
                  aria-label="关闭账户"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 用户信息 */}
              <div className="flex items-center gap-3 px-5 pb-5">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt="用户头像"
                    className="h-12 w-12 shrink-0 rounded-full border border-hairline object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-base font-bold text-primary">
                    {userInitial || <User size={20} className="text-muted" />}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-base font-bold text-ink">{displayName}</p>
                    {user?.role === 'ADMIN' && (
                      <span className="shrink-0 rounded-md bg-primary/12 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                        管理员
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-soft">{displayEmail}</p>
                </div>
              </div>

              <div className="border-t border-border-subtle px-3 py-3">
                <AccountRow
                  icon={<User size={17} />}
                  label="个人信息"
                  onClick={() => navigate(RoutePaths.ProfilePage)}
                />
                {user?.role === 'ADMIN' && (
                  <AccountRow
                    icon={<ShieldCheck size={17} />}
                    label="后台管理"
                    onClick={() => navigate(RoutePaths.AdminBlogs)}
                  />
                )}
              </div>

              <div
                className="mt-auto border-t border-border-subtle px-3 py-3"
                style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
              >
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-error transition-colors hover:bg-error/8"
                >
                  <LogOut size={17} />
                  <span className="text-sm font-medium">退出登录</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccountRow({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-text-secondary transition-colors hover:bg-primary/5 hover:text-ink"
    >
      <span className="text-muted">{icon}</span>
      <span className="flex-1 text-left text-sm font-medium">{label}</span>
      <ChevronRight size={16} className="text-muted-soft" />
    </button>
  );
}
