import React, { useState } from 'react';
import { Home, Upload, MessageSquare, Share2, Bell, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { KnowledgeGraph } from './KnowledgeGraph';
import { KnowledgeQA } from './KnowledgeQA';
import { RecentUploads } from './RecentUploads';
import { cn } from '../lib/utils';
import type { LucideIcon } from 'lucide-react';

export default function Dashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-bg-base text-text-main font-sans overflow-hidden p-4 gap-4">
      {/* 1. Left Sidebar: Independent flex child, NOT inside PanelGroup */}
      <aside
        className={cn(
          'bg-white/80 backdrop-blur-md rounded-3xl border border-border-subtle flex flex-col overflow-hidden shadow-sm transition-all duration-300 shrink-0',
          sidebarCollapsed ? 'w-[72px]' : 'w-[220px]',
        )}
      >
        <div className="h-20 flex items-center px-6 border-b border-border-subtle overflow-hidden">
          <div className="flex items-center gap-3 min-w-max">
            <div className="w-8 h-8 bg-text-main rounded-lg flex items-center justify-center">
              <Share2 className="text-white" size={18} />
            </div>
            {!sidebarCollapsed && <h1 className="text-lg font-bold tracking-tighter uppercase">LinkRag</h1>}
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
          <NavItem icon={Home} label="首页" active collapsed={sidebarCollapsed} />
          <NavItem icon={Upload} label="文件上传" collapsed={sidebarCollapsed} />
          <NavItem icon={MessageSquare} label="知识问答" collapsed={sidebarCollapsed} />
          <NavItem icon={Share2} label="知识图谱" collapsed={sidebarCollapsed} />
        </nav>

        <div className="p-4 border-t border-border-subtle bg-white/50">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center py-2 hover:bg-primary/5 rounded-xl text-text-main/40 hover:text-primary transition-colors mb-2"
          >
            {sidebarCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <div className="flex items-center gap-2">
                <ChevronLeft size={18} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Collapse</span>
              </div>
            )}
          </button>
          <div className="flex items-center gap-3 px-2 py-3 rounded-2xl bg-bg-base/30">
            <div className="w-8 h-8 rounded-full border border-text-main/10 bg-primary/20 shrink-0" />
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase truncate">Alex Chen</p>
                <p className="mono-label !text-[8px]">Pro Member</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 2+3. Center + Right: Resizable via PanelGroup */}
      <Group orientation="horizontal" className="flex-1 min-w-0">
        {/* Center Column: AI Q&A */}
        <Panel defaultSize={65} minSize={40}>
          <main className="h-full flex flex-col bg-white border border-border-subtle rounded-3xl shadow-sm overflow-hidden">
            <header className="h-20 px-8 flex items-center justify-between border-b border-border-subtle bg-white/80 backdrop-blur-md">
              <div className="flex flex-col">
                <span className="mono-label text-primary">Active Intelligence</span>
                <h2 className="text-xl serif-heading">Knowledge Synthesis</h2>
              </div>
              <div className="flex items-center gap-6">
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

            <div className="flex-1 overflow-hidden">
              <KnowledgeQA />
            </div>
          </main>
        </Panel>

        <ResizeHandle />

        {/* Right Sidebar: Graph & Files */}
        <Panel defaultSize={35} minSize={25}>
          <aside className="h-full flex flex-col bg-white/40 backdrop-blur-md border border-border-subtle rounded-3xl overflow-hidden relative group/sidebar">
            {/* Knowledge Graph Snapshot */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="p-6 pb-2 flex justify-between items-center bg-white/20 shrink-0">
                <div className="mono-label">Spatial Intelligence Map</div>
                <button className="text-[9px] font-bold uppercase tracking-widest hover:text-primary transition-colors">
                  Expand
                </button>
              </div>
              <div className="flex-1 p-4 pt-0 min-h-0">
                <div className="h-full min-h-0 bg-white/50 border border-border-subtle rounded-2xl overflow-hidden shadow-sm">
                  <KnowledgeGraph />
                </div>
              </div>
            </div>

            {/* File Archive */}
            <div className="h-[40%] min-h-0 flex flex-col bg-bg-base/20 border-t border-border-subtle shrink-0">
              <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-white/10 shrink-0">
                <div className="mono-label">Knowledge Vault</div>
                <button className="text-[9px] font-bold uppercase tracking-widest hover:text-primary transition-colors">
                  See Archive
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden relative group/upload">
                <div className="h-full overflow-y-auto px-6 py-2 scrollbar-none">
                  <RecentUploads />
                </div>

                {/* Drag Overlay Prompt */}
                <div className="absolute inset-0 bg-primary/5 backdrop-blur-[2px] opacity-0 group-hover/upload:opacity-100 transition-opacity pointer-events-none flex flex-col items-center justify-center border-t border-primary/20">
                  <Upload size={20} className="text-primary mb-2 animate-bounce" />
                  <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-primary">
                    Drop to Ingest Documents
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </Panel>
      </Group>

      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none z-[-1] opacity-5">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] border border-text-main rounded-full" />
        <div className="absolute bottom-0 right-0 w-[800px] h-px bg-text-main" />
      </div>
    </div>
  );
}

function ResizeHandle() {
  return (
    <Separator className="w-4 flex items-center justify-center group transition-all">
      <div className="w-0.5 h-8 bg-border-subtle group-hover:bg-primary rounded-full transition-colors" />
    </Separator>
  );
}

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  collapsed?: boolean;
}

function NavItem({ icon: Icon, label, active = false, collapsed = false }: NavItemProps) {
  return (
    <a
      href="#"
      className={cn(
        'flex items-center gap-3 px-4 py-3 transition-all duration-300 group relative rounded-2xl mx-1',
        active
          ? 'bg-[#7B6B5D] text-white shadow-lg shadow-[#7B6B5D]/10'
          : 'text-text-main/50 hover:bg-primary/5 hover:text-text-main border border-transparent',
      )}
    >
      <Icon
        size={18}
        className={cn('shrink-0 transition-transform group-hover:scale-110', active ? 'text-primary' : '')}
      />
      {!collapsed && <span className="text-xs font-bold uppercase tracking-widest truncate">{label}</span>}
      {active && !collapsed && <div className="absolute right-4 w-1 h-1 bg-primary rounded-full animate-pulse" />}

      {collapsed && (
        <div className="absolute left-full ml-4 px-3 py-1 bg-[#7B6B5D] text-white text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50 rounded-lg shadow-xl">
          {label}
        </div>
      )}
    </a>
  );
}
