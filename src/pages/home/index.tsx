import { Upload, MessageSquare, FolderOpen } from 'lucide-react';
import { Link } from 'react-router';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';

const quickActions = [
  { path: Routes.Files, icon: Upload, title: '上传文档', desc: '支持 PDF、Word、PPT' },
  { path: Routes.Chats, icon: MessageSquare, title: '知识问答', desc: '基于文档的智能对话' },
  { path: Routes.Datasets, icon: FolderOpen, title: '管理知识库', desc: '整理和管理文档' },
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

interface HomePageProps {
  darkMode?: boolean;
}

export default function HomePage({ darkMode }: HomePageProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className={cn(
        "h-20 px-8 flex items-center shrink-0 backdrop-blur-md border-b",
        darkMode ? "bg-[#252526] border-[#3c3c3c]" : "bg-white/80 border-border-subtle"
      )}>
        <div className="flex flex-col gap-1">
          <Breadcrumb
            items={[{ label: '首页', path: Routes.Home }]}
            darkMode={darkMode}
          />
          <h2 className={cn("text-xl font-medium", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>概览</h2>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className={cn("text-2xl font-bold mb-1", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>
            {getGreeting()}，Alex Chen
          </h1>
          <p className={cn("text-sm", darkMode ? "text-[#858585]" : "text-text-main/50")}>
            今天有什么可以帮您的？
          </p>
        </div>

        {/* Quick Actions */}
        <section className="mb-8">
          <div className="grid grid-cols-3 gap-4">
            {quickActions.map(({ path, icon: Icon, title, desc }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  "rounded-2xl p-5 transition-all duration-300 group cursor-pointer",
                  darkMode
                    ? "bg-[#2d2d2d] border border-[#3c3c3c] hover:border-[#c586c0]"
                    : "bg-white border-border-subtle hover:border-primary hover:shadow-lg"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors",
                  darkMode ? "bg-[#c586c0]/10 group-hover:bg-[#c586c0]/20" : "bg-primary/10 group-hover:bg-primary/20"
                )}>
                  <Icon size={20} className="text-[#c586c0]" />
                </div>
                <h4 className={cn("font-bold text-sm uppercase tracking-wider mb-1", darkMode ? "text-[#e0e0e0]" : "")}>{title}</h4>
                <p className={cn("text-xs", darkMode ? "text-[#858585]" : "text-text-main/50")}>{desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Section */}
        <div className="grid grid-cols-2 gap-6">
          {/* Recent Files */}
          <section className={cn("rounded-2xl p-5", darkMode ? "bg-[#2d2d2d] border border-[#3c3c3c]" : "bg-white border-border-subtle")}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn("text-xs font-bold uppercase tracking-wider", darkMode ? "text-[#858585]" : "text-text-main/50")}>最近文档</h3>
              <Link to={Routes.Files} className={cn(
                "text-[9px] font-bold uppercase tracking-widest hover:text-[#c586c0] transition-colors",
                darkMode ? "text-[#858585]" : "text-text-main/50"
              )}>
                查看全部
              </Link>
            </div>
            <div className="space-y-2">
              {[
                { name: '人工智能发展报告.pdf', time: '2小时前' },
                { name: '大模型技术综述.docx', time: '昨天' },
              ].map((file, i) => (
                <div key={i} className={cn(
                  "flex items-center justify-between py-2",
                  darkMode ? "border-[#3c3c3c] border-b last:border-0" : "border-b border-border-subtle last:border-0"
                )}>
                  <span className={cn("text-xs font-medium", darkMode ? "text-[#e0e0e0]" : "")}>{file.name}</span>
                  <span className={cn("mono-label text-[10px]", darkMode ? "text-[#858585]" : "")}>{file.time}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Chats */}
          <section className={cn("rounded-2xl p-5", darkMode ? "bg-[#2d2d2d] border border-[#3c3c3c]" : "bg-white border-border-subtle")}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn("text-xs font-bold uppercase tracking-wider", darkMode ? "text-[#858585]" : "text-text-main/50")}>最近对话</h3>
              <Link to={Routes.Chats} className={cn(
                "text-[9px] font-bold uppercase tracking-widest hover:text-[#c586c0] transition-colors",
                darkMode ? "text-[#858585]" : "text-text-main/50"
              )}>
                查看全部
              </Link>
            </div>
            <div className="space-y-2">
              {[
                { name: 'AI 技术问答助手', time: '5分钟前' },
                { name: '文档总结助手', time: '1小时前' },
              ].map((chat, i) => (
                <div key={i} className={cn(
                  "flex items-center justify-between py-2 cursor-pointer transition-colors",
                  darkMode ? "border-[#3c3c3c] border-b last:border-0" : "border-b border-border-subtle last:border-0"
                )}>
                  <span className={cn("text-xs font-medium", darkMode ? "text-[#e0e0e0]" : "")}>{chat.name}</span>
                  <span className={cn("mono-label text-[10px]", darkMode ? "text-[#858585]" : "")}>{chat.time}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}