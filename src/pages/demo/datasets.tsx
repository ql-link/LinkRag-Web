import { useState } from 'react';
import { NavLink } from 'react-router';
import { Plus, Search, Database, FileText, Clock, MoreHorizontal } from 'lucide-react';

const mockDatasets = [
  {
    id: '1',
    name: '产品文档',
    docCount: 128,
    size: '45.2 MB',
    updated: '2 小时前',
    desc: '产品使用手册、API 文档、更新日志',
  },
  {
    id: '2',
    name: '技术论文',
    docCount: 56,
    size: '128 MB',
    updated: '1 天前',
    desc: 'RAG、向量检索、知识图谱相关论文',
  },
  { id: '3', name: '会议纪要', docCount: 342, size: '12.8 MB', updated: '3 天前', desc: '2024 年全部门会议记录' },
  { id: '4', name: '竞品分析', docCount: 24, size: '8.4 MB', updated: '1 周前', desc: '主要竞品的功能对比和市场分析' },
  {
    id: '5',
    name: '内部 Wiki',
    docCount: 512,
    size: '256 MB',
    updated: '2 周前',
    desc: '公司内部知识库，含所有部门文档',
  },
  { id: '6', name: '客户反馈', docCount: 89, size: '5.6 MB', updated: '3 周前', desc: '客户问题汇总和解决方案' },
  { id: '7', name: '培训材料', docCount: 67, size: '34.2 MB', updated: '1 个月前', desc: '新员工入职培训和技术分享' },
  { id: '8', name: '法律合同', docCount: 45, size: '22.1 MB', updated: '1 个月前', desc: '合同模板和法律条款' },
];

export default function DemoDatasets() {
  const [search, setSearch] = useState('');

  const filtered = mockDatasets.filter((d) => d.name.includes(search) || d.desc.includes(search));

  return (
    <article className="size-full flex flex-col">
      {/* Filter Bar */}
      <header className="shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database size={20} strokeWidth={1.8} className="text-accent-default" />
            <h1 className="heading-section">知识库</h1>
            <span className="text-xs text-text-muted font-mono bg-bg-overlay px-2 py-0.5 rounded-full">
              {filtered.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="搜索知识库..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-56 pl-9 pr-3 text-sm bg-bg-surface border border-border-default rounded-lg focus:outline-none focus:border-accent-default transition-colors"
              />
            </div>
            <button className="h-9 px-4 text-sm font-medium text-white bg-accent-default hover:bg-accent-hover rounded-lg transition-colors flex items-center gap-2">
              <Plus size={16} strokeWidth={2} />
              新建知识库
            </button>
          </div>
        </div>
      </header>

      {/* Card Grid */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((dataset) => (
            <NavLink
              key={dataset.id}
              to={`/demo/datasets/${dataset.id}`}
              className="group block bg-bg-surface border border-border-default rounded-xl p-5 hover:border-accent-default/30 hover:shadow-card transition-all duration-150"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent-subtle flex items-center justify-center">
                  <Database size={18} className="text-accent-default" />
                </div>
                <button
                  className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover opacity-0 group-hover:opacity-100 transition-all"
                  onClick={(e) => e.preventDefault()}
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>

              <h3 className="font-semibold text-sm text-text-primary mb-1 truncate">{dataset.name}</h3>
              <p className="text-xs text-text-muted mb-4 line-clamp-2 leading-relaxed">{dataset.desc}</p>

              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <FileText size={12} />
                  {dataset.docCount} 文档
                </span>
                <span>{dataset.size}</span>
                <span className="flex items-center gap-1 ml-auto">
                  <Clock size={12} />
                  {dataset.updated}
                </span>
              </div>
            </NavLink>
          ))}
        </div>
      </div>
    </article>
  );
}
