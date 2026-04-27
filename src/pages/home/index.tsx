import { Upload, MessageSquare, FolderOpen, HelpCircle, Bell } from 'lucide-react';
import { Link } from 'react-router';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';

const stats = [
  { label: '文档总数', value: '24' },
  { label: '知识库', value: '5' },
  { label: '对话记录', value: '89' },
  { label: '本周新增', value: '5' },
];

const recentFiles = [
  { id: '1', name: '人工智能发展报告.pdf', type: 'PDF', time: '2小时前' },
  { id: '2', name: '大模型技术综述.docx', type: 'DOCX', time: '昨天' },
  { id: '3', name: '自然语言处理导论.pptx', type: 'PPTX', time: '3天前' },
];

const recentChats = [
  { id: '1', name: 'AI 技术问答助手', time: '5分钟前' },
  { id: '2', name: '文档总结助手', time: '1小时前' },
];

interface HomePageProps {
  darkMode?: boolean;
}

export default function HomePage({ darkMode }: HomePageProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className={cn(
        "h-20 px-8 flex items-center justify-between shrink-0 backdrop-blur-md",
        darkMode ? "bg-gray-800/80 border-gray-700" : "bg-white/80 border-border-subtle border-b"
      )}>
        <div className="flex flex-col gap-1">
          <Breadcrumb
            items={[{ label: '首页', path: Routes.Home }]}
            darkMode={darkMode}
          />
          <h2 className={cn("text-xl serif-heading", darkMode && "text-gray-100")}>概览</h2>
        </div>
        <div className="flex items-center gap-4">
          <button className={cn(
            "transition-colors",
            darkMode ? "text-gray-400 hover:text-gray-100" : "text-text-main/40 hover:text-primary"
          )}>
            <HelpCircle size={18} />
          </button>
          <div className={cn("w-px h-4", darkMode ? "bg-gray-700" : "bg-border-subtle")} />
          <button className={cn(
            "transition-colors relative",
            darkMode ? "text-gray-400 hover:text-gray-100" : "text-text-main/40 hover:text-primary"
          )}>
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-primary rounded-full" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Stats */}
        <section className="mb-8">
          <h3 className={cn("mono-label mb-4", darkMode && "text-gray-400")}>数据统计</h3>
          <div className="grid grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className={cn(
                "rounded-2xl p-4",
                darkMode ? "bg-gray-800/50 border border-gray-700" : "art-card"
              )}>
                <div className={cn("text-2xl font-bold", darkMode && "text-gray-100")}>{stat.value}</div>
                <div className={cn("mono-label", darkMode && "text-gray-400")}>{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-8">
          <h3 className={cn("mono-label mb-4", darkMode && "text-gray-400")}>快速操作</h3>
          <div className="grid grid-cols-3 gap-4">
            <Link
              to={Routes.Files}
              className={cn(
                "rounded-2xl p-6 transition-colors group cursor-pointer",
                darkMode
                  ? "bg-gray-800/50 border border-gray-700 hover:border-primary"
                  : "art-card hover:border-primary"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <Upload size={20} className="text-primary" />
              </div>
              <h4 className={cn("font-bold text-sm uppercase tracking-wider mb-1", darkMode && "text-gray-100")}>上传文档</h4>
              <p className="text-xs text-text-main/50">支持 PDF、Word、PPT</p>
            </Link>

            <Link
              to={Routes.Chats}
              className={cn(
                "rounded-2xl p-6 transition-colors group cursor-pointer",
                darkMode
                  ? "bg-gray-800/50 border border-gray-700 hover:border-primary"
                  : "art-card hover:border-primary"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <MessageSquare size={20} className="text-primary" />
              </div>
              <h4 className={cn("font-bold text-sm uppercase tracking-wider mb-1", darkMode && "text-gray-100")}>知识问答</h4>
              <p className="text-xs text-text-main/50">基于文档的智能对话</p>
            </Link>

            <Link
              to={Routes.Datasets}
              className={cn(
                "rounded-2xl p-6 transition-colors group cursor-pointer",
                darkMode
                  ? "bg-gray-800/50 border border-gray-700 hover:border-primary"
                  : "art-card hover:border-primary"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <FolderOpen size={20} className="text-primary" />
              </div>
              <h4 className={cn("font-bold text-sm uppercase tracking-wider mb-1", darkMode && "text-gray-100")}>管理知识库</h4>
              <p className="text-xs text-text-main/50">整理和管理文档</p>
            </Link>
          </div>
        </section>

        {/* Recent Activity */}
        <div className="grid grid-cols-2 gap-6">
          {/* Recent Files */}
          <section className={cn("rounded-2xl p-6", darkMode ? "bg-gray-800/50 border border-gray-700" : "art-card")}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn("mono-label", darkMode && "text-gray-400")}>最近文档</h3>
              <Link to={Routes.Files} className={cn(
                "text-[9px] font-bold uppercase tracking-widest hover:text-primary transition-colors",
                darkMode ? "text-gray-400 hover:text-primary" : "text-text-main/50"
              )}>
                查看全部
              </Link>
            </div>
            <div className="space-y-3">
              {recentFiles.map((file) => (
                <div
                  key={file.id}
                  className={cn(
                    "flex items-center justify-between py-2",
                    darkMode ? "border-gray-700 border-b last:border-0" : "border-b border-border-subtle last:border-0"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border flex items-center justify-center text-[8px] font-bold text-primary bg-primary/5 rounded">
                      {file.type}
                    </div>
                    <span className={cn("text-xs font-medium uppercase tracking-wider", darkMode && "text-gray-100")}>{file.name}</span>
                  </div>
                  <span className={cn("mono-label", darkMode && "text-gray-400")}>{file.time}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Chats */}
          <section className={cn("rounded-2xl p-6", darkMode ? "bg-gray-800/50 border border-gray-700" : "art-card")}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn("mono-label", darkMode && "text-gray-400")}>最近对话</h3>
              <Link to={Routes.Chats} className={cn(
                "text-[9px] font-bold uppercase tracking-widest hover:text-primary transition-colors",
                darkMode ? "text-gray-400 hover:text-primary" : "text-text-main/50"
              )}>
                查看全部
              </Link>
            </div>
            <div className="space-y-3">
              {recentChats.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "flex items-center justify-between py-2 cursor-pointer transition-colors",
                    darkMode ? "border-gray-700 border-b last:border-0" : "border-b border-border-subtle last:border-0"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MessageSquare size={12} className="text-primary" />
                    </div>
                    <span className={cn("text-xs font-medium uppercase tracking-wider", darkMode && "text-gray-100")}>{chat.name}</span>
                  </div>
                  <span className={cn("mono-label", darkMode && "text-gray-400")}>{chat.time}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}