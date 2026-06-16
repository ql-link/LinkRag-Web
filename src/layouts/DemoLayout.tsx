import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import {
  Plus,
  Search,
  Database,
  MessageSquare,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

/* ─── Mock Data ─── */

const knowledgeBases = [
  {
    id: 'kb-1',
    name: '产品文档',
    docCount: 128,
    conversations: [
      { id: 'c-1', title: 'RAG 检索优化方案', time: '刚刚' },
      { id: 'c-2', title: 'API 接口设计讨论', time: '1 小时前' },
      { id: 'c-3', title: '部署架构选型', time: '昨天' },
    ],
  },
  {
    id: 'kb-2',
    name: '技术论文',
    docCount: 56,
    conversations: [
      { id: 'c-4', title: '向量数据库选型对比', time: '2 小时前' },
      { id: 'c-5', title: 'Embedding 模型微调', time: '3 天前' },
    ],
  },
  {
    id: 'kb-3',
    name: '会议纪要',
    docCount: 342,
    conversations: [{ id: 'c-6', title: 'Q2 规划讨论要点', time: '昨天' }],
  },
  {
    id: 'kb-4',
    name: '竞品分析',
    docCount: 24,
    conversations: [],
  },
];

/* ─── Sidebar ─── */

function Sidebar({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();
  const [expandedKbs, setExpandedKbs] = useState<Set<string>>(new Set(['kb-1']));
  const [search, setSearch] = useState('');

  const toggleKb = (id: string) => {
    setExpandedKbs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /* ── Collapsed state ── */
  if (!expanded) {
    return (
      <aside className="w-[72px] shrink-0 border-r border-border-default bg-bg-overlay flex flex-col items-center py-4 gap-1.5">
        <button
          onClick={onToggle}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          <PanelLeftOpen size={18} />
        </button>

        <div className="w-8 border-t border-border-default my-2" />

        <button
          onClick={() => navigate('/demo')}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
            location.pathname === '/demo'
              ? 'bg-accent-default text-white'
              : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
          }`}
        >
          <Database size={16} />
        </button>

        <div className="w-8 border-t border-border-default my-1" />

        {knowledgeBases.map((kb) => {
          const active = location.pathname.includes(`/demo/chat/${kb.id}`);
          return (
            <button
              key={kb.id}
              onClick={() => navigate(`/demo/chat/${kb.id}`)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                active
                  ? 'bg-accent-subtle text-accent-default ring-1 ring-accent-default/20'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
              }`}
              title={kb.name}
            >
              {kb.name[0]}
            </button>
          );
        })}

        <div className="mt-auto" />

        <button
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </aside>
    );
  }

  /* ── Expanded state ── */
  return (
    <aside className="w-[280px] shrink-0 border-r border-border-default bg-bg-overlay flex flex-col">
      {/* Brand header — salmon accent anchor */}
      <div className="px-4 pt-4 pb-3 border-b border-accent-default/20">
        <div className="flex items-center justify-between mb-3">
          <NavLink to="/demo" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-default flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm tracking-tight">L</span>
            </div>
            <span className="font-heading font-semibold text-base tracking-tight text-text-primary">LinkRag</span>
          </NavLink>
          <button
            onClick={onToggle}
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
          >
            <PanelLeftClose size={15} />
          </button>
        </div>

        {/* New chat */}
        <button className="w-full h-9 flex items-center justify-center gap-2 text-sm font-medium text-accent-default bg-accent-subtle rounded-lg hover:bg-accent-tint transition-colors">
          <Plus size={15} strokeWidth={2.5} />
          新建对话
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="搜索对话..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs bg-bg-surface rounded-md border border-border-default focus:outline-none focus:border-accent-default/40 transition-colors"
          />
        </div>
      </div>

      {/* Knowledge base tree */}
      <div className="flex-1 overflow-auto px-2 pb-3">
        <div className="px-2 pt-1 pb-1.5">
          <span className="text-[10px] font-semibold tracking-widest uppercase text-text-muted">知识库</span>
        </div>

        {knowledgeBases.map((kb) => {
          const expanded_ = expandedKbs.has(kb.id);
          const kbActive = location.pathname.includes(`/demo/chat/${kb.id}`);

          return (
            <div key={kb.id} className="mb-0.5">
              {/* KB header */}
              <button
                onClick={() => toggleKb(kb.id)}
                className={`w-full flex items-center gap-2 h-9 px-2.5 rounded-lg text-xs transition-colors group ${
                  kbActive
                    ? 'bg-accent-subtle text-accent-default'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                {expanded_ ? (
                  <ChevronDown size={12} className="text-text-muted shrink-0" />
                ) : (
                  <ChevronRight size={12} className="text-text-muted shrink-0" />
                )}
                <Database size={14} className={kbActive ? 'text-accent-default' : 'text-text-muted'} />
                <span className="truncate font-medium flex-1 text-left">{kb.name}</span>
                <span className="text-text-muted text-[10px] font-mono tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                  {kb.docCount}
                </span>
              </button>

              {/* Conversations */}
              {expanded_ && (
                <div className="ml-5 pl-3 border-l border-border-default/60 space-y-px py-1">
                  {kb.conversations.length === 0 ? (
                    <p className="text-[11px] text-text-muted px-2 py-1.5">暂无对话</p>
                  ) : (
                    kb.conversations.map((conv) => {
                      const convActive = location.pathname.endsWith(conv.id);
                      return (
                        <NavLink
                          key={conv.id}
                          to={`/demo/chat/${kb.id}/${conv.id}`}
                          className={`flex items-center gap-2 h-8 px-2 rounded-md text-xs transition-colors ${
                            convActive
                              ? 'bg-bg-surface text-text-primary font-medium shadow-sm'
                              : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                          }`}
                        >
                          <MessageSquare size={11} className="shrink-0 text-text-muted" />
                          <span className="truncate">{conv.title}</span>
                        </NavLink>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-border-default">
        <div className="space-y-0.5 mb-2">
          <button className="w-full flex items-center gap-2.5 h-8 px-2.5 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors">
            <FileText size={14} />
            文档管理
          </button>
          <button className="w-full flex items-center gap-2.5 h-8 px-2.5 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors">
            <Settings size={14} />
            设置
          </button>
        </div>

        <div className="flex items-center justify-between h-9 px-2.5 rounded-lg bg-bg-surface border border-border-default">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-accent-default flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">F</span>
            </div>
            <span className="text-xs font-medium text-text-primary">方一帆</span>
          </div>
          <button
            onClick={toggleTheme}
            className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary transition-colors"
          >
            {darkMode ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ─── Layout ─── */

export default function DemoLayout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  return (
    <div className="h-screen flex bg-bg-base text-text-primary">
      <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded(!sidebarExpanded)} />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
