import { useNavigate } from 'react-router';
import { Plus, Database, FileText, MessageSquare, Clock, MoreHorizontal, ArrowRight } from 'lucide-react';

const knowledgeBases = [
  {
    id: 'kb-1',
    name: '产品文档',
    docCount: 128,
    chatCount: 24,
    size: '45.2 MB',
    updated: '2 小时前',
    desc: '产品使用手册、API 文档、更新日志',
  },
  {
    id: 'kb-2',
    name: '技术论文',
    docCount: 56,
    chatCount: 12,
    size: '128 MB',
    updated: '1 天前',
    desc: 'RAG、向量检索、知识图谱相关论文',
  },
  {
    id: 'kb-3',
    name: '会议纪要',
    docCount: 342,
    chatCount: 8,
    size: '12.8 MB',
    updated: '3 天前',
    desc: '2024 年全部门会议记录',
  },
  {
    id: 'kb-4',
    name: '竞品分析',
    docCount: 24,
    chatCount: 3,
    size: '8.4 MB',
    updated: '1 周前',
    desc: '主要竞品的功能对比和市场分析',
  },
  {
    id: 'kb-5',
    name: '内部 Wiki',
    docCount: 512,
    chatCount: 45,
    size: '256 MB',
    updated: '2 周前',
    desc: '公司内部知识库，含所有部门文档',
  },
  {
    id: 'kb-6',
    name: '客户反馈',
    docCount: 89,
    chatCount: 16,
    size: '5.6 MB',
    updated: '3 周前',
    desc: '客户问题汇总和解决方案',
  },
];

const [featured, ...rest] = knowledgeBases;

export default function DemoHome() {
  const navigate = useNavigate();

  return (
    <div className="size-full overflow-auto">
      <div className="max-w-5xl mx-auto px-8 py-12">
        {/* Hero — strong hierarchy, tight tracking */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-default" />
            <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-accent-default">知识库</span>
          </div>
          <h1 className="heading-page font-heading text-text-primary mb-3">你的知识库</h1>
          <p className="text-sm text-text-secondary max-w-lg leading-relaxed">
            选择一个知识库开始对话。AI 会基于其中的文档为你提供精准回答，每个引用都可溯源。
          </p>
        </div>

        {/* Featured KB — spans 2 columns, salmon top border, larger */}
        <button
          onClick={() => navigate(`/demo/chat/${featured.id}`)}
          className="group w-full text-left mb-6 bg-bg-surface border border-border-default rounded-xl overflow-hidden hover:border-accent-default/30 hover:shadow-card transition-all duration-150"
        >
          <div className="h-1 bg-accent-default" />
          <div className="p-6 flex items-start gap-5">
            <div className="w-11 h-11 rounded-lg bg-accent-subtle flex items-center justify-center shrink-0">
              <Database size={18} className="text-accent-default" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1.5">
                <h2 className="text-lg font-semibold text-text-primary font-heading">{featured.name}</h2>
                <span className="text-[10px] font-medium tracking-wider uppercase text-accent-default bg-accent-subtle px-2 py-0.5 rounded-full">
                  最活跃
                </span>
              </div>
              <p className="text-sm font-knowledge text-text-secondary leading-relaxed mb-4">{featured.desc}</p>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="flex items-center gap-1.5">
                  <FileText size={12} />
                  <span className="font-mono tabular-nums">{featured.docCount}</span> 个文档
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageSquare size={12} />
                  <span className="font-mono tabular-nums">{featured.chatCount}</span> 次对话
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={12} />
                  {featured.updated}
                </span>
                <span className="ml-auto flex items-center gap-1 text-accent-default opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                  进入对话 <ArrowRight size={12} />
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* Rest of KBs — 3-col grid, varied rhythm */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((kb) => (
            <button
              key={kb.id}
              onClick={() => navigate(`/demo/chat/${kb.id}`)}
              className="group text-left bg-bg-surface border border-border-default rounded-xl p-5 hover:border-accent-default/30 hover:shadow-card transition-all duration-150 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-bg-overlay flex items-center justify-center">
                  <Database size={15} className="text-text-muted group-hover:text-accent-default transition-colors" />
                </div>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-hover opacity-0 group-hover:opacity-100 transition-all"
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>

              <h3 className="font-semibold text-sm mb-1 text-text-primary">{kb.name}</h3>
              <p className="text-xs font-knowledge text-text-muted mb-auto leading-relaxed">{kb.desc}</p>

              <div className="flex items-center gap-3 text-[11px] text-text-muted pt-3 mt-3 border-t border-border-default/50">
                <span className="flex items-center gap-1">
                  <FileText size={11} />
                  <span className="font-mono tabular-nums">{kb.docCount}</span>
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare size={11} />
                  <span className="font-mono tabular-nums">{kb.chatCount}</span>
                </span>
                <span className="ml-auto flex items-center gap-1">
                  <Clock size={11} />
                  {kb.updated}
                </span>
              </div>
            </button>
          ))}

          {/* New KB card — salmon-dashed border */}
          <button className="group flex flex-col items-center justify-center min-h-[180px] bg-bg-surface border-2 border-dashed border-accent-default/25 rounded-xl hover:border-accent-default/50 hover:bg-accent-subtle/20 transition-all duration-150">
            <div className="w-10 h-10 rounded-full bg-accent-subtle flex items-center justify-center mb-3 group-hover:bg-accent-tint transition-colors">
              <Plus size={20} className="text-accent-default" strokeWidth={2} />
            </div>
            <span className="text-sm font-medium text-text-secondary group-hover:text-accent-default transition-colors">
              新建知识库
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
