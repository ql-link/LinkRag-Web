import { useEffect, useState } from 'react';
import { DatabaseZap, FileUp, MessageSquarePlus } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Routes } from '@/routes';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getConversations } from '@/services/chat';
import { getRecentKnowledgeFiles } from '@/services/dataset';
import type { ConversationDTO, KnowledgeFileDTO } from '@/types/api';

const quickActions = [
  { path: Routes.Files, icon: FileUp, title: '存入文档', desc: '让散落的信息，化作你的数字养分' },
  { path: Routes.Datasets, icon: DatabaseZap, title: '梳理知识库', desc: '编织网状记忆，构建你的私人智库' },
];

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
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-frosted px-8 backdrop-blur-md">
        <div className="flex flex-col gap-1">
          <Breadcrumb items={[{ label: '首页', path: Routes.Home }]} darkMode={darkMode} />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-bg-base px-4 pb-24 pt-4 sm:px-10 sm:pb-12 sm:pt-8">
        <div className="mx-auto max-w-6xl space-y-10">
          <section className="space-y-6">
            <div className="pl-1">
              <h3 className="text-2xl serif-heading text-text-main">
                {getGreeting()}，<span className="font-serif italic tracking-tight">{displayName}</span>
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                在这片属于你的专注空间，安静地沉淀灵感与知识。
              </p>
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <Link
                to={Routes.Chats}
                state={{ openCreate: true }}
                className="group art-card relative flex min-h-[132px] flex-col rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
              >
                <div className="mb-5">
                  <div className="icon-tile h-10 w-10 shadow-sm transition-transform group-hover:scale-105">
                    <MessageSquarePlus size={20} strokeWidth={2} />
                  </div>
                </div>
                <h4 className="mb-1.5 mt-auto text-sm font-bold tracking-wide text-text-main">开启对谈</h4>
                <p className="text-xs leading-relaxed text-text-tertiary">随时唤醒思考，展开一次随性的灵感碰撞</p>
              </Link>
              {quickActions.map(({ path, icon: Icon, title, desc }) => (
                <Link
                  key={path}
                  to={path}
                  className="group art-card relative flex min-h-[132px] flex-col rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:shadow-lg"
                >
                  <div className="mb-5">
                    <div className="icon-tile h-10 w-10 shadow-sm transition-transform group-hover:scale-105">
                      <Icon size={20} strokeWidth={2} />
                    </div>
                  </div>
                  <h4 className="mb-1.5 mt-auto text-sm font-bold tracking-wide text-text-main">{title}</h4>
                  <p className="text-xs leading-relaxed text-text-tertiary">{desc}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* Recent Section */}
          <div className="grid grid-cols-1 gap-10 xl:grid-cols-2">
            {/* Recent Files */}
            <section className="border-t border-border-subtle pt-6">
              <h3 className="mb-4 pl-1 text-xs font-bold uppercase tracking-widest text-text-secondary">最近文档</h3>
              <div className="divide-y divide-border-subtle">
                {recentFilesLoading ? (
                  <p className="py-4 pl-1 text-sm text-text-tertiary">正在加载文档</p>
                ) : recentFilesError ? (
                  <p className="py-4 pl-1 text-sm text-[#d97373]">{recentFilesError}</p>
                ) : recentFiles.length === 0 ? (
                  <p className="py-4 pl-1 text-sm text-text-tertiary">此地仍是留白，等待你的第一篇记录</p>
                ) : (
                  recentFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => navigate(`/datasets/${file.datasetId}`)}
                      className="group flex min-h-[48px] cursor-pointer items-center justify-between gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-text-main/5"
                    >
                      <span className="min-w-0 truncate text-sm font-medium text-text-main/80 transition-colors group-hover:text-text-main">
                        {file.originalFilename}
                      </span>
                      <span className="mono-label shrink-0 opacity-70 transition-opacity group-hover:opacity-100">
                        {formatRelativeTime(file.createdAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Recent Chats */}
            <section className="border-t border-border-subtle pt-6">
              <h3 className="mb-4 pl-1 text-xs font-bold uppercase tracking-widest text-text-secondary">最近对话</h3>
              <div className="divide-y divide-border-subtle">
                {recentChats.length === 0 ? (
                  <p className="py-4 pl-1 text-sm text-text-tertiary">时光安静，暂无回音</p>
                ) : (
                  recentChats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => navigate(`/chats/${chat.id}`)}
                      className="group flex min-h-[48px] cursor-pointer items-center justify-between gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-text-main/5"
                    >
                      <span className="min-w-0 truncate text-sm font-medium text-text-main/80 transition-colors group-hover:text-text-main">
                        {chat.title}
                      </span>
                      <span className="mono-label shrink-0 opacity-70 transition-opacity group-hover:opacity-100">
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
