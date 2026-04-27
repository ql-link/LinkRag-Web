import { useState } from 'react';
import { Database, Plus, Search, ArrowRight } from 'lucide-react';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';

const mockDatasets = [
  { id: '1', name: 'AI 技术文档', count: 12, updated: '2小时前' },
  { id: '2', name: '产品需求文档', count: 8, updated: '昨天' },
  { id: '3', name: '技术架构文档', count: 15, updated: '3天前' },
  { id: '4', name: '市场分析报告', count: 6, updated: '上周' },
  { id: '5', name: '用户研究文档', count: 9, updated: '2周前' },
  { id: '6', name: '运营数据报告', count: 11, updated: '3周前' },
];

interface DatasetsPageProps {
  darkMode?: boolean;
}

export default function DatasetsPage({ darkMode }: DatasetsPageProps) {
  const [searchString, setSearchString] = useState('');

  const filteredDatasets = mockDatasets.filter((d) =>
    d.name.toLowerCase().includes(searchString.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className={cn(
        "h-20 px-8 flex items-center justify-between shrink-0 backdrop-blur-md",
        darkMode ? "bg-gray-800/80 border-gray-700" : "bg-white/80 border-border-subtle border-b"
      )}>
        <div className="flex flex-col">
          <span className="mono-label text-primary">Knowledge</span>
          <h2 className={cn("text-xl serif-heading", darkMode && "text-gray-100")}>知识库</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={14} className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2",
              darkMode ? "text-gray-400" : "text-text-main/30"
            )} />
            <input
              type="text"
              placeholder="搜索知识库..."
              value={searchString}
              onChange={(e) => setSearchString(e.target.value)}
              className={cn(
                "w-48 pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-primary",
                darkMode
                  ? "bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500"
                  : "bg-bg-base/50 border-border-subtle"
              )}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-text-main text-white rounded-xl hover:opacity-90 transition-opacity">
            <Plus size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">新建</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Stats Bar */}
        <div className={cn("flex items-center gap-6 mb-6 mono-label", darkMode && "text-gray-400")}>
          <span>共 {mockDatasets.length} 个知识库</span>
          <span className={darkMode ? "text-gray-600" : "text-border-subtle"}>|</span>
          <span>24 个文档</span>
        </div>

        {/* Dataset Grid */}
        <div className="grid grid-cols-3 gap-4">
          {filteredDatasets.map((dataset) => (
            <div
              key={dataset.id}
              className={cn(
                "rounded-2xl p-5 transition-colors cursor-pointer group",
                darkMode
                  ? "bg-gray-800/50 border border-gray-700 hover:border-primary"
                  : "art-card hover:border-primary"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Database size={18} className="text-primary" />
                </div>
                <ArrowRight size={14} className={cn(
                  "group-hover:translate-x-1 transition-all",
                  darkMode ? "text-gray-500 group-hover:text-primary" : "text-text-main/20 group-hover:text-primary"
                )} />
              </div>
              <h3 className={cn("font-bold text-sm uppercase tracking-wider mb-1 group-hover:text-primary transition-colors", darkMode && "text-gray-100")}>
                {dataset.name}
              </h3>
              <div className={cn("flex items-center justify-between", darkMode && "text-gray-400")}>
                <span className="mono-label">{dataset.count} 个文档</span>
                <span className="mono-label">{dataset.updated}</span>
              </div>
            </div>
          ))}

          {/* Add New */}
          <div className={cn(
            "rounded-2xl border-dashed flex flex-col items-center justify-center min-h-[140px] p-5 cursor-pointer transition-colors",
            darkMode
              ? "border-gray-700 text-gray-400 hover:text-primary hover:border-primary"
              : "art-card text-text-main/40 hover:text-primary hover:border-primary"
          )}>
            <Plus size={24} className="mb-2" />
            <span className="text-xs font-bold uppercase tracking-wider">添加知识库</span>
          </div>
        </div>
      </div>
    </div>
  );
}