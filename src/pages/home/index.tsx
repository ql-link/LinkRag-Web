import { useEffect, useState } from 'react';
import { ArrowRight, DatabaseZap, FileUp, MessageSquarePlus, MessagesSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getConversations } from '@/services/chat';
import { getRecentKnowledgeFiles } from '@/services/dataset';
import type { ConversationDTO, KnowledgeFileDTO } from '@/types/api';

const quickActions = [
  { path: Routes.Files, icon: FileUp, title: '上传文档', desc: '导入 PDF、Word、Markdown' },
  { path: Routes.Chats, icon: MessagesSquare, title: '知识问答', desc: '基于引用片段生成回答' },
  { path: Routes.Datasets, icon: DatabaseZap, title: '管理知识库', desc: '维护数据集与索引状态' },
];

function panelClassName(darkMode?: boolean) {
  return cn(
    'rounded-2xl border backdrop-blur-sm transition-all duration-300',
    darkMode ? 'border-[#3c3c3c] bg-[#2d2d2d]' : 'border-border-subtle bg-white/50 shadow-sm',
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 9) return '早上好';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  if (hour < 22) return '晚上好';
  return '夜深了';
}

function formatRelativeTime(value: string) {
  if (!value) return '';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '';
  const diff = Date.now() - time;
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))}天前`;
  return new Date(time).toLocaleDateString('zh-CN');
}

export default function HomePage() {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.nickname || user?.username || '当前用户';
  const [recentFiles, setRecentFiles] = useState<KnowledgeFileDTO[]>([]);
  const [recentFilesLoading, setRecentFilesLoading] = useState(true);
  const [recentFilesError, setRecentFilesError] = useState('');
  const [recentChats, setRecentChats] = useState<ConversationDTO[]>([]);

  useEffect(() => {
    let active = true;
    setRecentFilesLoading(true);
    setRecentFilesError('');

    getRecentKnowledgeFiles(5)
      .then((files) => {
        if (active) setRecentFiles(files);
      })
      .catch((error) => {
        console.error('Failed to load recent files:', error);
        if (active) {
          setRecentFiles([]);
          setRecentFilesError('文档加载失败');
        }
      })
      .finally(() => {
        if (active) setRecentFilesLoading(false);
      });

    getConversations(1, 5)
      .then((result) => {
        if (active) setRecentChats(result.items);
      })
      .catch((error) => {
        console.error('Failed to load recent conversations:', error);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header
        className={cn(
          'h-16 px-8 flex items-center justify-between shrink-0 backdrop-blur-md',
          darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/80 border-border-subtle border-b',
        )}
      >
        <div className="flex flex-col gap-1">
          <Breadcrumb items={[{ label: '首页', path: Routes.Home }]} darkMode={darkMode} />
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={Routes.Chats}
            state={{ openCreate: true }}
            className={cn(
              'h-9 w-fit rounded-lg px-4 text-xs font-bold inline-flex items-center gap-2 transition-colors',
              darkMode ? 'bg-[#094771] text-white hover:bg-[#0a5280]' : 'bg-text-main text-white hover:opacity-90',
            )}
          >
            <MessageSquarePlus size={15} />
            新建会话
          </Link>
        </div>
      </header>

      {/* Content */}
      <div
        className={cn(
          'flex-1 overflow-y-auto px-4 pb-24 pt-2 sm:px-8 sm:pb-8 sm:pt-6',
          darkMode ? 'bg-[#1e1e1e]' : 'bg-bg-base',
        )}
      >
        <div className="space-y-5">
          <section className={panelClassName(darkMode)}>
            <div
              className={cn(
                'flex flex-col gap-4 border-b px-5 py-4 md:flex-row md:items-center md:justify-between',
                darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
              )}
            >
              <div>
                <h3 className={cn('text-base font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                  {getGreeting()}，<span className="font-serif italic tracking-tight">{displayName}</span>
                </h3>
                <p className={cn('mt-1 text-xs leading-5', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
                  选择一个入口，继续处理文档、知识库或对话任务。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { label: 'RECENT FILES', value: recentFilesLoading ? '...' : recentFiles.length },
                  { label: 'RECENT CHATS', value: recentChats.length },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-right',
                      darkMode ? 'border-[#3c3c3c] bg-[#252526]' : 'border-border-subtle bg-white/70',
                    )}
                  >
                    <p className={cn('text-sm font-bold leading-none', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>
                      {item.value}
                    </p>
                    <p className={cn('mono-label mt-1 text-[8px]', darkMode && 'text-[#858585]')}>{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
              <Link
                to={Routes.Chats}
                state={{ openCreate: true }}
                className={cn(
                  'group relative flex min-h-[132px] flex-col rounded-2xl border p-4 transition-all duration-300',
                  darkMode
                    ? 'border-[#3c3c3c]/60 bg-[#252526] hover:border-[#3b82f6]'
                    : 'border-border-subtle/60 bg-white/50 hover:border-primary hover:bg-white',
                )}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                      darkMode
                        ? 'bg-[#3b82f6]/10 text-[#3b82f6] group-hover:bg-[#3b82f6]/20'
                        : 'bg-primary/10 text-primary group-hover:bg-primary/20',
                    )}
                  >
                    <MessageSquarePlus size={21} strokeWidth={1.8} />
                  </div>
                  <ArrowRight
                    size={16}
                    className={cn(
                      'mt-1 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100',
                      darkMode ? 'text-[#3b82f6]' : 'text-primary',
                    )}
                  />
                </div>
                <h4
                  className={cn(
                    'mb-1 mt-auto text-sm font-bold tracking-wide',
                    darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
                  )}
                >
                  快速会话
                </h4>
                <p className={cn('text-xs leading-5', darkMode ? 'text-[#858585]' : 'text-text-main/55')}>
                  直接新建一个对话，马上开始问答
                </p>
              </Link>
              {quickActions.map(({ path, icon: Icon, title, desc }) => (
                <Link
                  key={path}
                  to={path}
                  className={cn(
                    'group relative flex min-h-[132px] flex-col rounded-2xl border p-4 transition-all duration-300',
                    darkMode
                      ? 'border-[#3c3c3c]/60 bg-[#252526] hover:border-[#3b82f6]'
                      : 'border-border-subtle/60 bg-white/50 hover:border-primary hover:bg-white',
                  )}
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
                        darkMode
                          ? 'bg-[#3b82f6]/10 text-[#3b82f6] group-hover:bg-[#3b82f6]/20'
                          : 'bg-primary/10 text-primary group-hover:bg-primary/20',
                      )}
                    >
                      <Icon size={21} strokeWidth={1.8} />
                    </div>
                    <ArrowRight
                      size={16}
                      className={cn(
                        'mt-1 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100',
                        darkMode ? 'text-[#3b82f6]' : 'text-primary',
                      )}
                    />
                  </div>
                  <h4
                    className={cn(
                      'mb-1 mt-auto text-sm font-bold tracking-wide',
                      darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
                    )}
                  >
                    {title}
                  </h4>
                  <p className={cn('text-xs leading-5', darkMode ? 'text-[#858585]' : 'text-text-main/55')}>{desc}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* Recent Section */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {/* Recent Files */}
            <section className={panelClassName(darkMode)}>
              <div
                className={cn(
                  'flex items-center justify-between gap-4 border-b px-5 py-4',
                  darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
                )}
              >
                <h3 className={cn('text-base font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>最近文档</h3>
                <Link
                  to={Routes.Files}
                  className={cn(
                    'shrink-0 text-[9px] font-bold uppercase tracking-widest transition-colors',
                    darkMode ? 'text-[#858585]' : 'text-text-main/50',
                    darkMode ? 'hover:text-[#3b82f6]' : 'hover:text-primary',
                  )}
                >
                  查看全部
                </Link>
              </div>
              <div className="space-y-1 p-3">
                {recentFilesLoading ? (
                  <p className={cn('py-3 text-xs', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>正在加载文档</p>
                ) : recentFilesError ? (
                  <p className={cn('py-3 text-xs', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>
                    {recentFilesError}
                  </p>
                ) : recentFiles.length === 0 ? (
                  <p className={cn('py-3 text-xs', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>暂无文档</p>
                ) : (
                  recentFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => navigate(`/datasets/${file.datasetId}`)}
                      className={cn(
                        'flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors',
                        darkMode ? 'hover:bg-[#252526] hover:text-[#3b82f6]' : 'hover:bg-bg-base hover:text-primary',
                      )}
                    >
                      <span className={cn('min-w-0 truncate text-xs font-medium', darkMode ? 'text-[#e0e0e0]' : '')}>
                        {file.originalFilename}
                      </span>
                      <span className={cn('mono-label shrink-0 text-[10px]', darkMode ? 'text-[#858585]' : '')}>
                        {formatRelativeTime(file.createdAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Recent Chats */}
            <section className={panelClassName(darkMode)}>
              <div
                className={cn(
                  'flex items-center justify-between gap-4 border-b px-5 py-4',
                  darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
                )}
              >
                <h3 className={cn('text-base font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>最近对话</h3>
                <Link
                  to={Routes.Chats}
                  className={cn(
                    'shrink-0 text-[9px] font-bold uppercase tracking-widest transition-colors',
                    darkMode ? 'text-[#858585]' : 'text-text-main/50',
                    darkMode ? 'hover:text-[#3b82f6]' : 'hover:text-primary',
                  )}
                >
                  查看全部
                </Link>
              </div>
              <div className="space-y-1 p-3">
                {recentChats.length === 0 ? (
                  <p className={cn('py-3 text-xs', darkMode ? 'text-[#858585]' : 'text-text-main/50')}>暂无对话</p>
                ) : (
                  recentChats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => navigate(`/chats/${chat.id}`)}
                      className={cn(
                        'flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors',
                        darkMode ? 'hover:bg-[#252526] hover:text-[#3b82f6]' : 'hover:bg-bg-base hover:text-primary',
                      )}
                    >
                      <span className={cn('min-w-0 truncate text-xs font-medium', darkMode ? 'text-[#e0e0e0]' : '')}>
                        {chat.title}
                      </span>
                      <span className={cn('mono-label shrink-0 text-[10px]', darkMode ? 'text-[#858585]' : '')}>
                        {formatRelativeTime(chat.updatedAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
