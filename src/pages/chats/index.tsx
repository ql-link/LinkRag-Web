import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { MessageSquare, Plus, Search, ArrowRight, X } from 'lucide-react';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { DatasetBadgeList } from '@/components/DatasetBadge';
import { DatasetSelector } from '@/components/DatasetSelector';
import { getConversations, createConversation } from '@/services/chat';
import { getDatasets } from '@/services/dataset';
import type { ConversationDTO } from '@/types/api';
import type { Dataset as DatasetType } from '@/types';

interface ChatsPageProps {
  darkMode?: boolean;
}

export default function ChatsPage({ darkMode }: ChatsPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchString, setSearchString] = useState('');
  const [chats, setChats] = useState<ConversationDTO[]>([]);
  const [datasets, setDatasets] = useState<DatasetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [newChatKbIds, setNewChatKbIds] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const openCreate = location.state?.openCreate;
    if (openCreate) {
      setCreateDialogOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
    const datasetId = location.state?.datasetId;
    if (datasetId) {
      setNewChatKbIds([String(datasetId)]);
      setCreateDialogOpen(true);
    }
  }, [location.pathname, location.state, navigate]);

  const loadData = async () => {
    try {
      const [convsResult, dsResult] = await Promise.all([
        getConversations(1, 100),
        getDatasets(1, 100),
      ]);
      setChats(convsResult.items);
      setDatasets(dsResult.items.map(d => ({
        id: String(d.id),
        name: d.name,
        count: 0,
        updated: d.updatedAt,
        file_ids: [],
      })));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = async () => {
    if (!newChatName.trim()) return;
    if (newChatKbIds.length === 0) {
      alert('请先选择一个数据集');
      return;
    }
    try {
      const conv = await createConversation({
        title: newChatName,
        datasetId: Number(newChatKbIds[0]),
      });
      setChats((prev) => [conv, ...prev]);
      setNewChatName('');
      setNewChatKbIds([]);
      setCreateDialogOpen(false);
      navigate(`/chats/${conv.id}`);
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const filteredChats = chats.filter((c) =>
    c.title.toLowerCase().includes(searchString.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className={cn(
        "h-20 px-8 flex items-center justify-between shrink-0 backdrop-blur-md",
        darkMode ? "bg-[#252526] border-[#3c3c3c]" : "bg-white/80 border-border-subtle border-b"
      )}>
        <div className="flex flex-col gap-1">
          <Breadcrumb
            items={[
              { label: '首页', path: Routes.Home },
              { label: '对话' }
            ]}
            darkMode={darkMode}
          />
          <h2 className={cn("text-xl serif-heading", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>对话</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={14} className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2",
              darkMode ? "text-[#858585]" : "text-text-main/30"
            )} />
            <input
              type="text"
              placeholder="搜索对话..."
              value={searchString}
              onChange={(e) => setSearchString(e.target.value)}
              className={cn(
                "w-48 pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-[#3b82f6]",
                darkMode
                  ? "bg-[#2d2d2d] border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]"
                  : "bg-bg-base/50 border-border-subtle"
              )}
            />
          </div>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-text-main text-white rounded-xl hover:opacity-90 transition-opacity"
          >
            <Plus size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">新建对话</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Stats Bar */}
        <div className={cn("flex items-center gap-6 mb-6 mono-label", darkMode && "text-gray-400")}>
          <span>共 {chats.length} 个对话</span>
          <span className={darkMode ? "text-gray-600" : "text-border-subtle"}>|</span>
          <span>89 条消息</span>
        </div>

        {/* Chat Grid */}
        <div className="grid grid-cols-3 gap-4">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => navigate(`/chats/${chat.id}`)}
              className={cn(
                "rounded-2xl p-5 transition-colors cursor-pointer group",
                darkMode
                  ? "bg-[#2d2d2d] border border-[#3c3c3c] hover:border-[#3b82f6]"
                  : "art-card hover:border-primary"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                  <MessageSquare size={18} className="text-blue-500" />
                </div>
                <ArrowRight size={14} className={cn(
                  "group-hover:translate-x-1 transition-all",
                  darkMode ? "text-gray-500 group-hover:text-primary" : "text-text-main/20 group-hover:text-primary"
                )} />
              </div>
              <h3 className={cn("font-bold text-sm uppercase tracking-wider mb-2 group-hover:text-[#3b82f6] transition-colors", darkMode ? "text-[#e0e0e0]" : "")}>
                {chat.title}
              </h3>
              {chat.datasetId && (
                <div className="mb-3">
                  <span className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                    darkMode ? "bg-[#094771] text-blue-400" : "bg-blue-100 text-blue-600"
                  )}>
                    数据集 #{chat.datasetId}
                  </span>
                </div>
              )}
              <div className={cn("flex items-center justify-between", darkMode ? "text-[#858585]" : "")}>
                <span className="mono-label">dataset #{chat.datasetId}</span>
                <span className="mono-label">{chat.updatedAt}</span>
              </div>
            </div>
          ))}

          {/* Add New */}
          <div
            onClick={() => setCreateDialogOpen(true)}
            className={cn(
              "rounded-2xl border-dashed flex flex-col items-center justify-center min-h-[140px] p-5 cursor-pointer transition-colors",
              darkMode
                ? "border-[#3c3c3c] text-[#858585] hover:text-[#3b82f6] hover:border-[#3b82f6]"
                : "art-card text-text-main/40 hover:text-primary hover:border-primary"
            )}
          >
            <Plus size={24} className="mb-2" />
            <span className="text-xs font-bold uppercase tracking-wider">新建对话</span>
          </div>
        </div>

        {/* Create Chat Dialog */}
        {createDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCreateDialogOpen(false)} />
            <div className={cn(
              "relative w-[480px] rounded-2xl shadow-2xl overflow-hidden",
              darkMode ? "bg-[#252526] border border-[#3c3c3c]" : "bg-white border border-border-subtle"
            )}>
              <div className={cn("flex items-center justify-between px-6 py-4 border-b", darkMode ? "border-[#3c3c3c]" : "border-border-subtle")}>
                <h3 className={cn("text-lg font-bold", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>新建对话</h3>
                <button onClick={() => setCreateDialogOpen(false)} className={cn("p-2 rounded-xl hover:bg-[#2d2d2d] transition-colors", darkMode ? "text-[#858585]" : "text-text-main/50")}>
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className={cn("block mb-2 text-xs font-bold uppercase tracking-wider", darkMode ? "text-[#cccccc]" : "text-text-main")}>
                    对话名称
                  </label>
                  <input
                    type="text"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    placeholder="输入对话名称"
                    className={cn(
                      "w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#3b82f6]",
                      darkMode
                        ? "bg-[#2d2d2d] border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]"
                        : "bg-bg-base/50 border-border-subtle"
                    )}
                  />
                </div>
                <div>
                  <label className={cn("block mb-2 text-xs font-bold uppercase tracking-wider", darkMode ? "text-[#cccccc]" : "text-text-main")}>
                    关联数据集
                  </label>
                  <DatasetSelector
                    datasets={datasets}
                    selectedKbIds={newChatKbIds}
                    onChange={setNewChatKbIds}
                    darkMode={darkMode}
                  />
                </div>
              </div>
              <div className={cn("flex items-center justify-end gap-3 px-6 py-4 border-t bg-bg-base/30", darkMode ? "border-[#3c3c3c]" : "border-border-subtle")}>
                <button
                  onClick={() => setCreateDialogOpen(false)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors",
                    darkMode
                      ? "text-[#cccccc] hover:bg-[#2d2d2d]"
                      : "hover:bg-gray-100"
                  )}
                >
                  取消
                </button>
                <button
                  onClick={handleCreateChat}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-opacity",
                    darkMode
                      ? "bg-[#094771] text-white hover:bg-[#0a5280]"
                      : "bg-text-main text-white hover:opacity-90"
                  )}
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
