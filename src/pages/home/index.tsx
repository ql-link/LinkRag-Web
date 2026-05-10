import { ArrowRight, DatabaseZap, FileUp, MessagesSquare, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';

const quickActions = [
  { path: Routes.Files, icon: FileUp, title: '上传文档', desc: '导入 PDF、Word、Markdown' },
  { path: Routes.Chats, icon: MessagesSquare, title: '知识问答', desc: '基于引用片段生成回答' },
  { path: Routes.Datasets, icon: DatabaseZap, title: '管理知识库', desc: '维护数据集与索引状态' },
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
          <h2 className={cn("text-xl font-semibold tracking-tight", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>概览</h2>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Greeting */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl border",
              darkMode ? "border-[#3c3c3c] bg-[#2d2d2d] text-[#c586c0]" : "border-primary/25 bg-primary/10 text-primary"
            )}>
              <Sparkles size={18} />
            </div>
            <h1 className={cn("text-2xl font-semibold tracking-tight", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>
              {getGreeting()}，Alex Chen
            </h1>
          </div>
          <p className={cn("text-sm", darkMode ? "text-[#858585]" : "text-text-main/55")}>
            选择一个入口，继续处理文档、知识库或对话任务。
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
                  "group cursor-pointer rounded-2xl border p-5 transition-all duration-300",
                  darkMode
                    ? "bg-[#2d2d2d] border-[#3c3c3c] hover:border-[#c586c0]"
                    : "bg-white border-border-subtle hover:border-primary hover:shadow-lg"
                )}
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center transition-colors",
                    darkMode ? "bg-[#c586c0]/10 text-[#c586c0] group-hover:bg-[#c586c0]/20" : "bg-primary/10 text-primary group-hover:bg-primary/20"
                  )}>
                    <Icon size={21} strokeWidth={1.8} />
                  </div>
                  <ArrowRight
                    size={16}
                    className={cn(
                      "mt-1 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100",
                      darkMode ? "text-[#c586c0]" : "text-primary",
                    )}
                  />
                </div>
                <h4 className={cn("font-semibold text-sm tracking-tight mb-1", darkMode ? "text-[#e0e0e0]" : "")}>{title}</h4>
                <p className={cn("text-xs leading-5", darkMode ? "text-[#858585]" : "text-text-main/55")}>{desc}</p>
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
