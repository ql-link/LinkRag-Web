import { useState, useEffect, type MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Loader2, MessageSquare, Pencil, Plus, Search, Trash2, X, ArrowUpDown, RefreshCw } from 'lucide-react';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { DatasetSelector } from '@/components/DatasetSelector';
import { ApiError } from '@/lib/api-client';
import { getConversations, createConversation, updateConversation, deleteConversation } from '@/services/chat';
import { getDatasets } from '@/services/dataset';
import type { ConversationDTO } from '@/types/api';
import type { Dataset as DatasetType } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';

function formatTime(value: string) {
  if (!value) return '-';
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? value : time.toLocaleString('zh-CN');
}

export default function ChatsPage() {
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const [searchString, setSearchString] = useState('');
  const [chats, setChats] = useState<ConversationDTO[]>([]);
  const [datasets, setDatasets] = useState<DatasetType[]>([]);
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt'>('updatedAt');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newChatName, setNewChatName] = useState('');
  const [newChatKbIds, setNewChatKbIds] = useState<string[]>([]);
  const [editingChat, setEditingChat] = useState<ConversationDTO | null>(null);
  const [editChatName, setEditChatName] = useState('');
  const [updating, setUpdating] = useState(false);
  const [createNameError, setCreateNameError] = useState('');
  const [editNameError, setEditNameError] = useState('');
  const [deletingChatIds, setDeletingChatIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

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
    setLoading(true);
    try {
      const [convsResult, dsResult] = await Promise.all([getConversations(1, 100), getDatasets(1, 100)]);
      setChats(convsResult.items);
      setDatasets(
        dsResult.items.map((d) => ({
          id: String(d.id),
          name: d.name,
          count: 0,
          updated: d.updatedAt,
          file_ids: [],
        })),
      );
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setCreateNameError('');
  };

  const handleCreateChat = async () => {
    if (!newChatName.trim()) return;
    if (newChatKbIds.length === 0) {
      alert('请先选择一个数据集');
      return;
    }
    const selectedDatasetId = Number(newChatKbIds[0]);
    const isDuplicate = chats.some((c) => c.title.trim() === newChatName.trim() && c.datasetId === selectedDatasetId);
    if (isDuplicate) {
      setCreateNameError('当前数据集下已存在同名对话');
      return;
    }
    try {
      const conv = await createConversation({
        title: newChatName,
        datasetId: selectedDatasetId,
      });
      setChats((prev) => [conv, ...prev]);
      setNewChatName('');
      setNewChatKbIds([]);
      setCreateNameError('');
      setCreateDialogOpen(false);
    } catch (error) {
      if (error instanceof ApiError && error.code === 400) {
        setCreateNameError(error.message);
      }
      console.error('Failed to create chat:', error);
    }
  };

  const handleEditChat = (chat: ConversationDTO, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setEditingChat(chat);
    setEditChatName(chat.title);
  };

  const resetEditDialog = () => {
    setEditingChat(null);
    setEditChatName('');
    setEditNameError('');
  };

  const handleCloseEditDialog = () => {
    if (updating) return;
    resetEditDialog();
  };

  const handleUpdateChat = async () => {
    if (!editingChat || updating) return;
    const title = editChatName.trim();
    if (!title) return;

    const isDuplicate = chats.some(
      (c) => c.id !== editingChat.id && c.title.trim() === title && c.datasetId === editingChat.datasetId,
    );
    if (isDuplicate) {
      setEditNameError('当前数据集下已存在同名对话');
      return;
    }

    setUpdating(true);
    try {
      const updated = await updateConversation(editingChat.id, { title });
      setChats((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      resetEditDialog();
      addToast('success', '对话名称已更新');
    } catch (error) {
      if (error instanceof ApiError && error.code === 400) {
        setEditNameError(error.message);
      }
      console.error('Failed to update conversation:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteChat = async (chat: ConversationDTO, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (deletingChatIds.includes(chat.id)) return;
    if (!confirm(`确定要删除对话「${chat.title}」吗？删除后无法恢复。`)) return;

    setDeletingChatIds((prev) => [...prev, chat.id]);
    try {
      await deleteConversation(chat.id);
      setChats((prev) => prev.filter((item) => item.id !== chat.id));
      if (editingChat?.id === chat.id) {
        resetEditDialog();
      }
      addToast('success', '对话已删除');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    } finally {
      setDeletingChatIds((prev) => prev.filter((id) => id !== chat.id));
    }
  };

  const filteredChats = chats
    .filter((c) => c.title.toLowerCase().includes(searchString.toLowerCase()))
    .sort((a, b) => {
      const timeA = new Date(a[sortBy] || '').getTime();
      const timeB = new Date(b[sortBy] || '').getTime();
      return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
    });
  const datasetNameById = new Map(datasets.map((dataset) => [Number(dataset.id), dataset.name]));
  const hasSearch = searchString.trim().length > 0;
  const sortLabel = sortBy === 'createdAt' ? '按创建时间排序' : '按更新时间排序';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header
        className={cn(
          'h-16 px-8 flex items-center justify-between shrink-0 backdrop-blur-md',
          darkMode ? 'bg-[#252526] border-[#3c3c3c]' : 'bg-white/80 border-border-subtle border-b',
        )}
      >
        <div className="flex flex-col gap-1">
          <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '对话' }]} darkMode={darkMode} />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search
              size={14}
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2',
                darkMode ? 'text-[#858585]' : 'text-text-main/30',
              )}
            />
            <input
              type="text"
              placeholder="搜索对话..."
              value={searchString}
              onChange={(e) => setSearchString(e.target.value)}
              className={cn(
                'h-9 w-48 rounded-lg border pl-9 pr-3 text-xs outline-none transition-colors focus:border-primary/50',
                darkMode
                  ? 'bg-[#2d2d2d] border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]'
                  : 'bg-bg-base/50 border-border-subtle text-text-main placeholder:text-text-main/35',
              )}
            />
          </div>
          <div
            className={cn(
              'flex h-9 items-center gap-2 rounded-lg border px-3',
              darkMode ? 'bg-[#2d2d2d] border-[#3c3c3c]' : 'bg-bg-base/50 border-border-subtle',
            )}
          >
            <button
              type="button"
              onClick={() => setSortBy((prev) => (prev === 'createdAt' ? 'updatedAt' : 'createdAt'))}
              className={cn(
                'flex items-center gap-2 text-xs bg-transparent focus:outline-none',
                darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
              )}
              title="点击切换排序方式"
            >
              <ArrowUpDown size={14} className={darkMode ? 'text-[#858585]' : 'text-text-main/40'} />
              <span>{sortLabel}</span>
            </button>
          </div>
          <button
            onClick={() => void loadData()}
            disabled={loading}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
              darkMode ? 'hover:bg-[#2d2d2d] text-[#858585]' : 'hover:bg-gray-100 text-text-main/40',
              loading && 'opacity-60',
            )}
            title="刷新对话"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex items-center gap-2">
              <Loader2 size={16} className={cn('animate-spin', darkMode ? 'text-[#858585]' : 'text-text-main/45')} />
              <div className={cn('mono-label', darkMode ? 'text-[#858585]' : '')}>加载中...</div>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Bar */}
            <div className={cn('mb-4 flex items-center gap-4 mono-label', darkMode && 'text-gray-400')}>
              <span>共 {chats.length} 个对话</span>
              {hasSearch && <span>筛选出 {filteredChats.length} 个</span>}
            </div>

            {/* Chat Grid */}
            <div className="grid auto-rows-[136px] grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredChats.map((chat) => {
                const deleting = deletingChatIds.includes(chat.id);
                const datasetName = datasetNameById.get(chat.datasetId) ?? `数据集 #${chat.datasetId}`;

                return (
                  <div
                    key={chat.id}
                    onClick={() => navigate(`/chats/${chat.id}`)}
                    className={cn(
                      'group flex h-full min-h-0 cursor-pointer flex-col rounded-2xl p-4 transition-colors',
                      darkMode
                        ? 'border border-[#3c3c3c] bg-[#2d2d2d] hover:border-[#565656]'
                        : 'art-card hover:border-text-main/18 hover:bg-white',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                            darkMode
                              ? 'border-[#3c3c3c] bg-[#252526] text-[#bdbdbd]'
                              : 'border-border-subtle bg-bg-base/70 text-[#7d746b]',
                          )}
                        >
                          <MessageSquare size={17} />
                        </div>
                        <div className="min-w-0">
                          <h3
                            className={cn(
                              'truncate text-sm font-bold tracking-wide transition-colors',
                              darkMode ? 'text-[#e0e0e0]' : 'text-text-main',
                            )}
                          >
                            {chat.title}
                          </h3>
                          <p
                            className={cn(
                              'mono-label mt-1 truncate',
                              darkMode ? 'text-[#858585]' : 'text-text-main/45',
                            )}
                          >
                            更新 {formatTime(chat.updatedAt)}
                          </p>
                        </div>
                      </div>
                      {chat.isPinned ? (
                        <span
                          className={cn(
                            'shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold leading-none',
                            darkMode
                              ? 'border-[#4a4a4a] bg-[#252526] text-[#d0d0d0]'
                              : 'border-border-subtle bg-bg-base/70 text-text-main/62',
                          )}
                        >
                          置顶
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 min-w-0">
                      <span
                        className={cn(
                          'inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium',
                          darkMode
                            ? 'border-[#3c3c3c] bg-[#252526] text-[#a8a8a8]'
                            : 'border-border-subtle bg-bg-base/70 text-text-main/62',
                        )}
                      >
                        <span className="truncate">{datasetName}</span>
                      </span>
                    </div>

                    <div className="mt-auto flex items-center justify-end">
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          onClick={(event) => handleEditChat(chat, event)}
                          className={cn(
                            'inline-flex h-8 w-8 items-center justify-center rounded-xl border transition-colors',
                            darkMode
                              ? 'border-[#3c3c3c] bg-[#252526] text-[#bdbdbd] hover:border-[#565656] hover:bg-[#2f2f2f] hover:text-[#f0f0f0]'
                              : 'border-border-subtle bg-white/75 text-text-main/55 hover:border-text-main/20 hover:bg-bg-base hover:text-text-main',
                          )}
                          title="编辑对话"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(event) => void handleDeleteChat(chat, event)}
                          disabled={deleting}
                          className={cn(
                            'inline-flex h-8 w-8 items-center justify-center rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                            darkMode
                              ? 'border-[#3c3c3c] bg-[#252526] text-[#bdbdbd] hover:border-red-400/35 hover:text-red-300'
                              : 'border-border-subtle bg-white/75 text-text-main/55 hover:border-red-200 hover:bg-red-50 hover:text-red-500',
                          )}
                          title="删除对话"
                        >
                          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add New */}
              <div
                onClick={() => setCreateDialogOpen(true)}
                className={cn(
                  'flex h-full min-h-0 cursor-pointer flex-col items-center justify-center rounded-2xl border-dashed p-4 transition-colors',
                  darkMode
                    ? 'border-[#3c3c3c] text-[#858585] hover:text-[#d0d0d0] hover:border-[#4a4a4a]'
                    : 'art-card text-text-main/40 hover:text-text-main/60 hover:border-border-subtle',
                )}
              >
                <Plus size={22} className="mb-2" />
                <span className="text-xs font-bold tracking-wide">新建对话</span>
              </div>
            </div>
          </>
        )}

        {/* Create Chat Dialog */}
        {createDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseCreateDialog} />
            <div
              className={cn(
                'relative w-[480px] rounded-2xl shadow-2xl overflow-visible',
                darkMode ? 'bg-[#252526] border border-[#3c3c3c]' : 'bg-white border border-border-subtle',
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-between px-6 py-4 border-b',
                  darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
                )}
              >
                <h3 className={cn('text-lg font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>新建对话</h3>
                <button
                  onClick={handleCloseCreateDialog}
                  className={cn(
                    'p-2 rounded-xl hover:bg-[#2d2d2d] transition-colors',
                    darkMode ? 'text-[#858585]' : 'text-text-main/50',
                  )}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label
                    className={cn(
                      'block mb-2 text-xs font-bold uppercase tracking-wider',
                      darkMode ? 'text-[#cccccc]' : 'text-text-main',
                    )}
                  >
                    对话名称
                  </label>
                  <input
                    type="text"
                    value={newChatName}
                    onChange={(e) => {
                      setNewChatName(e.target.value);
                      if (createNameError) setCreateNameError('');
                    }}
                    placeholder="输入对话名称"
                    className={cn(
                      'w-full px-4 py-2.5 rounded-xl border shadow-none text-sm focus:outline-none focus:ring-0',
                      createNameError
                        ? 'border-red-400 focus:border-red-400'
                        : darkMode
                          ? 'border-[#3c3c3c] focus:border-border-subtle'
                          : 'border-border-subtle focus:border-border-subtle',
                      darkMode ? 'bg-[#2d2d2d] text-[#e0e0e0] placeholder:text-[#6b6b6b]' : 'bg-white',
                    )}
                  />
                  {createNameError && <p className="mt-1.5 text-xs text-red-500">{createNameError}</p>}
                </div>
                <div>
                  <label
                    className={cn(
                      'block mb-2 text-xs font-bold uppercase tracking-wider',
                      darkMode ? 'text-[#cccccc]' : 'text-text-main',
                    )}
                  >
                    关联数据集（单选）
                  </label>
                  <DatasetSelector
                    datasets={datasets}
                    selectedKbIds={newChatKbIds}
                    onChange={setNewChatKbIds}
                    darkMode={darkMode}
                    single
                    placeholder="请选择一个数据集"
                  />
                </div>
              </div>
              <div
                className={cn(
                  'flex items-center justify-end gap-3 px-6 py-4 border-t bg-bg-base/30',
                  darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
                )}
              >
                <button
                  onClick={handleCloseCreateDialog}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors',
                    darkMode ? 'text-[#cccccc] hover:bg-[#2d2d2d]' : 'hover:bg-gray-100',
                  )}
                >
                  取消
                </button>
                <button
                  onClick={handleCreateChat}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-opacity',
                    darkMode
                      ? 'bg-[#094771] text-white hover:bg-[#0a5280]'
                      : 'bg-text-main text-white hover:opacity-90',
                  )}
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Chat Dialog */}
        {editingChat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCloseEditDialog} />
            <div
              className={cn(
                'relative w-[480px] rounded-2xl shadow-2xl overflow-hidden',
                darkMode ? 'bg-[#252526] border border-[#3c3c3c]' : 'bg-white border border-border-subtle',
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-between px-6 py-4 border-b',
                  darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
                )}
              >
                <h3 className={cn('text-lg font-bold', darkMode ? 'text-[#e0e0e0]' : 'text-text-main')}>编辑对话</h3>
                <button
                  onClick={handleCloseEditDialog}
                  disabled={updating}
                  className={cn(
                    'p-2 rounded-xl transition-colors disabled:opacity-60',
                    darkMode ? 'text-[#858585] hover:bg-[#2d2d2d]' : 'text-text-main/50 hover:bg-gray-100',
                  )}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label
                    className={cn(
                      'block mb-2 text-xs font-bold uppercase tracking-wider',
                      darkMode ? 'text-[#cccccc]' : 'text-text-main',
                    )}
                  >
                    对话名称
                  </label>
                  <input
                    type="text"
                    value={editChatName}
                    onChange={(e) => {
                      setEditChatName(e.target.value);
                      if (editNameError) setEditNameError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleUpdateChat();
                    }}
                    maxLength={128}
                    placeholder="输入对话名称"
                    className={cn(
                      'w-full px-4 py-2.5 rounded-xl border shadow-none text-sm focus:outline-none focus:ring-0',
                      editNameError
                        ? 'border-red-400 focus:border-red-400'
                        : darkMode
                          ? 'border-[#3c3c3c] focus:border-border-subtle'
                          : 'border-border-subtle focus:border-border-subtle',
                      darkMode ? 'bg-[#2d2d2d] text-[#e0e0e0] placeholder:text-[#6b6b6b]' : 'bg-white',
                    )}
                  />
                  {editNameError && <p className="mt-1.5 text-xs text-red-500">{editNameError}</p>}
                </div>
              </div>
              <div
                className={cn(
                  'flex items-center justify-end gap-3 px-6 py-4 border-t bg-bg-base/30',
                  darkMode ? 'border-[#3c3c3c]' : 'border-border-subtle',
                )}
              >
                <button
                  onClick={handleCloseEditDialog}
                  disabled={updating}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-60',
                    darkMode ? 'text-[#cccccc] hover:bg-[#2d2d2d]' : 'hover:bg-gray-100',
                  )}
                >
                  取消
                </button>
                <button
                  onClick={() => void handleUpdateChat()}
                  disabled={!editChatName.trim() || updating}
                  className={cn(
                    'px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-opacity disabled:cursor-not-allowed disabled:opacity-60',
                    darkMode
                      ? 'bg-[#094771] text-white hover:bg-[#0a5280]'
                      : 'bg-text-main text-white hover:opacity-90',
                  )}
                >
                  {updating ? '保存中' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
