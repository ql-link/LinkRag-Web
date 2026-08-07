import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { BarChart3, ChevronLeft, Cpu, Database, Menu, Moon, SquarePen, Sun, User, X } from 'lucide-react';
import { Routes as RoutePaths } from '@/routes';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getConversations } from '@/services/chat';
import { getCachedConversations, setCachedConversations } from '@/lib/conversationsCache';
import { LinkRagMark } from '@/components/LinkRagMark';
import { cn } from '@/lib/utils';
import type { ConversationDTO } from '@/types/api';

// 抽屉底部「功能入口」（对话由顶部「新建对话」+ 历史列表承载，故此处不重复）。
const drawerNavItems = [
  { path: RoutePaths.Chats, name: '新建对话', icon: SquarePen },
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
  return 'LinkRag';
}

function getUserInitial(user: ReturnType<typeof useAuth>['user']) {
  return user?.nickname?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || '';
}

function getMobileBackTarget(pathname: string): string {
  const parseConfigMatch = pathname.match(/^\/datasets\/([^/]+)\/parse-config/);
  if (parseConfigMatch) return `/datasets/${parseConfigMatch[1]}`;
  if (/^\/datasets\/[^/]+/.test(pathname)) return RoutePaths.Datasets;
  return RoutePaths.Chats;
}

/**
 * 移动端（<1024px）认证外壳：顶栏（左侧菜单或返回 / 中标题）+ 左抽屉（新建对话 /
 * 历史会话 / 功能入口 / 账户入口）。无底部 tab 栏。
 */
export function MobileAppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode, toggleTheme } = useTheme();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationDTO[]>(() => getCachedConversations(user?.id) ?? []);

  const topInset: CSSProperties = { paddingTop: 'env(safe-area-inset-top)' };
  const displayName = user?.nickname || user?.username || '当前用户';
  const displayEmail = user?.email || '未设置邮箱';
  const userInitial = getUserInitial(user);
  const isNewChatPage = location.pathname === RoutePaths.Chats;
  const mobileBackTarget = getMobileBackTarget(location.pathname);

  // 路由切换时收起所有浮层
  useEffect(() => {
    setDrawerOpen(false);
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

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-bg-base font-sans text-text-main">
      {/* Top bar */}
      <header
        className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border-subtle bg-canvas/88 px-2 backdrop-blur-xl"
        style={topInset}
      >
        {isNewChatPage ? (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-primary/8 hover:text-ink"
            aria-label="打开菜单"
          >
            <Menu size={20} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate(mobileBackTarget)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-primary/8 hover:text-ink"
            aria-label="返回上一级"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <p className="truncate text-base font-bold tracking-wide text-text-main">{getMobileTitle(location.pathname)}</p>
        <div className="h-10 w-10 shrink-0" aria-hidden="true" />
      </header>

      {/* Main content */}
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>

      {/* Left drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.button
              className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              aria-label="关闭菜单遮罩"
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col bg-canvas shadow-[18px_0_46px_rgba(18,18,18,0.2)]"
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
                {/* 功能入口 */}
                <div>
                  <p className="mono-label mb-2 px-1">功能</p>
                  <div className="space-y-0.5">
                    {drawerNavItems.map(({ path, name, icon: Icon }) => {
                      const active =
                        path !== RoutePaths.Chats &&
                        (location.pathname === path || location.pathname.startsWith(`${path}/`));
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

                {/* 最近对话 */}
                <div className="mt-5 border-t border-border-subtle pt-4">
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
                              'flex w-full items-center rounded-lg px-3 py-2 text-left transition-colors',
                              active
                                ? 'bg-primary/10 text-ink'
                                : 'text-text-secondary hover:bg-primary/5 hover:text-ink',
                            )}
                          >
                            <span className="truncate text-sm">{(item.title ?? '新对话').trim() || '新对话'}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div
                className="shrink-0 bg-canvas px-3 py-3 shadow-[0_-10px_24px_rgba(18,18,18,0.05)]"
                style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      navigate(RoutePaths.ProfilePage);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-primary/5"
                    aria-label="打开账户"
                  >
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt="用户头像"
                        className="h-9 w-9 shrink-0 rounded-full border border-hairline object-cover"
                      />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                        {userInitial || <User size={16} className="text-muted" />}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">{displayName}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-soft">{displayEmail}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-primary/5 hover:text-ink"
                    aria-label={darkMode ? '切换到日间模式' : '切换到夜间模式'}
                    title={darkMode ? '日间模式' : '夜间模式'}
                  >
                    {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
