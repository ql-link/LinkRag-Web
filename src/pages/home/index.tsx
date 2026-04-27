import { Upload, MessageSquare, FolderOpen, Plus, HelpCircle, Bell } from 'lucide-react';
import { Link } from 'react-router';
import { Routes } from '@/routes';

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

export default function HomePage() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="h-20 px-8 flex items-center justify-between border-b border-border-subtle bg-white/80 backdrop-blur-md shrink-0">
        <div className="flex flex-col">
          <span className="mono-label text-primary">Dashboard</span>
          <h2 className="text-xl serif-heading">概览</h2>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-text-main/40 hover:text-primary transition-colors">
            <HelpCircle size={18} />
          </button>
          <div className="w-px h-4 bg-border-subtle" />
          <button className="text-text-main/40 hover:text-primary transition-colors relative">
            <Bell size={18} />
            <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-primary rounded-full" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Stats */}
        <section className="mb-8">
          <h3 className="mono-label mb-4">数据统计</h3>
          <div className="grid grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="art-card rounded-2xl p-4">
                <div className="text-2xl font-bold text-text-main">{stat.value}</div>
                <div className="mono-label">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-8">
          <h3 className="mono-label mb-4">快速操作</h3>
          <div className="grid grid-cols-3 gap-4">
            <Link
              to={Routes.Files}
              className="art-card rounded-2xl p-6 hover:border-primary transition-colors group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <Upload size={20} className="text-primary" />
              </div>
              <h4 className="font-bold text-sm uppercase tracking-wider mb-1">上传文档</h4>
              <p className="text-xs text-text-main/50">支持 PDF、Word、PPT</p>
            </Link>

            <Link
              to={Routes.Chats}
              className="art-card rounded-2xl p-6 hover:border-primary transition-colors group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <MessageSquare size={20} className="text-primary" />
              </div>
              <h4 className="font-bold text-sm uppercase tracking-wider mb-1">知识问答</h4>
              <p className="text-xs text-text-main/50">基于文档的智能对话</p>
            </Link>

            <Link
              to={Routes.Datasets}
              className="art-card rounded-2xl p-6 hover:border-primary transition-colors group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                <FolderOpen size={20} className="text-primary" />
              </div>
              <h4 className="font-bold text-sm uppercase tracking-wider mb-1">管理知识库</h4>
              <p className="text-xs text-text-main/50">整理和管理文档</p>
            </Link>
          </div>
        </section>

        {/* Recent Activity */}
        <div className="grid grid-cols-2 gap-6">
          {/* Recent Files */}
          <section className="art-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="mono-label">最近文档</h3>
              <Link to={Routes.Files} className="text-[9px] font-bold uppercase tracking-widest hover:text-primary transition-colors">
                查看全部
              </Link>
            </div>
            <div className="space-y-3">
              {recentFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border border-text-main/10 flex items-center justify-center text-[8px] font-bold text-primary bg-primary/5 rounded">
                      {file.type}
                    </div>
                    <span className="text-xs font-medium uppercase tracking-wider">{file.name}</span>
                  </div>
                  <span className="mono-label">{file.time}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Chats */}
          <section className="art-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="mono-label">最近对话</h3>
              <Link to={Routes.Chats} className="text-[9px] font-bold uppercase tracking-widest hover:text-primary transition-colors">
                查看全部
              </Link>
            </div>
            <div className="space-y-3">
              {recentChats.map((chat) => (
                <div
                  key={chat.id}
                  className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0 cursor-pointer hover:text-primary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                      <MessageSquare size={12} className="text-primary" />
                    </div>
                    <span className="text-xs font-medium uppercase tracking-wider">{chat.name}</span>
                  </div>
                  <span className="mono-label">{chat.time}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}