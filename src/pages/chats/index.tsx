import { useState } from 'react';
import { MessageSquare, Plus, Search, ArrowRight } from 'lucide-react';

const mockChats = [
  { id: '1', name: 'AI 技术问答助手', messages: 45, updated: '5分钟前' },
  { id: '2', name: '文档总结助手', messages: 23, updated: '1小时前' },
  { id: '3', name: '技术方案咨询', messages: 67, updated: '昨天' },
  { id: '4', name: '市场分析问答', messages: 31, updated: '3天前' },
  { id: '5', name: '产品需求分析', messages: 18, updated: '上周' },
  { id: '6', name: '代码审查助手', messages: 52, updated: '2周前' },
];

export default function ChatsPage() {
  const [searchString, setSearchString] = useState('');

  const filteredChats = mockChats.filter((c) =>
    c.name.toLowerCase().includes(searchString.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="h-20 px-8 flex items-center justify-between border-b border-border-subtle bg-white/80 backdrop-blur-md shrink-0">
        <div className="flex flex-col">
          <span className="mono-label text-primary">Assistant</span>
          <h2 className="text-xl serif-heading">对话</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-main/30" />
            <input
              type="text"
              placeholder="搜索对话..."
              value={searchString}
              onChange={(e) => setSearchString(e.target.value)}
              className="w-48 pl-9 pr-4 py-2 bg-bg-base/50 border border-border-subtle rounded-xl text-xs focus:outline-none focus:border-primary"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-text-main text-white rounded-xl hover:opacity-90 transition-opacity">
            <Plus size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">新建对话</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Stats Bar */}
        <div className="flex items-center gap-6 mb-6 mono-label">
          <span>共 {mockChats.length} 个对话</span>
          <span className="text-border-subtle">|</span>
          <span>89 条消息</span>
        </div>

        {/* Chat Grid */}
        <div className="grid grid-cols-3 gap-4">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className="art-card rounded-2xl p-5 hover:border-primary transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                  <MessageSquare size={18} className="text-purple-500" />
                </div>
                <ArrowRight size={14} className="text-text-main/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="font-bold text-sm uppercase tracking-wider mb-1 group-hover:text-primary transition-colors">
                {chat.name}
              </h3>
              <div className="flex items-center justify-between">
                <span className="mono-label">{chat.messages} 条消息</span>
                <span className="mono-label">{chat.updated}</span>
              </div>
            </div>
          ))}

          {/* Add New */}
          <div className="art-card rounded-2xl p-5 border-dashed flex flex-col items-center justify-center min-h-[140px] text-text-main/40 hover:text-primary hover:border-primary transition-colors cursor-pointer">
            <Plus size={24} className="mb-2" />
            <span className="text-xs font-bold uppercase tracking-wider">新建对话</span>
          </div>
        </div>
      </div>
    </div>
  );
}