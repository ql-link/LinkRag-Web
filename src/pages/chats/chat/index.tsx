import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Send, Pin, PinOff, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Routes } from '@/routes';
import { getMessages, getConversations, deleteConversation } from '@/services/chat';
import type { MessageDTO, ConversationDTO } from '@/types/api';

interface ChatPageProps {
  darkMode?: boolean;
}

export default function ChatPage({ darkMode }: ChatPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<ConversationDTO | null>(null);
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadConversation();
    }
  }, [id]);

  const loadConversation = async () => {
    if (!id) return;
    try {
      const convList = await getConversations(1, 100);
      const conv = convList.items.find((c) => c.id === Number(id));
      setConversation(conv || null);

      if (conv) {
        const msgResult = await getMessages(conv.id, 1, 100);
        setMessages(msgResult.items);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || !conversation) return;
    alert('后端暂未提供发送消息接口，已在 web/docs/ToLink-缺失接口清单.md 中记录。');
  };

  const handlePin = async () => {
    if (!conversation) return;
    alert('后端暂未提供会话更新接口，当前无法置顶。');
  };

  const handleDelete = async () => {
    if (!conversation) return;
    if (!confirm('确定要删除这个对话吗？')) return;
    try {
      await deleteConversation(conversation.id);
      navigate(Routes.Chats);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className={cn("mono-label", darkMode ? "text-[#858585]" : "")}>加载中...</div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className={cn("text-lg mb-4", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>对话不存在</p>
        <button
          onClick={() => navigate(Routes.Chats)}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider",
            darkMode
              ? "bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c]"
              : "bg-text-main text-white hover:opacity-90"
          )}
        >
          返回对话列表
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className={cn(
        "h-16 px-6 flex items-center justify-between shrink-0 border-b",
        darkMode ? "bg-[#252526] border-[#3c3c3c]" : "bg-white/80 border-border-subtle"
      )}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(Routes.Chats)}
            className={cn(
              "p-2 rounded-xl transition-colors",
              darkMode ? "hover:bg-[#2d2d2d] text-[#858585]" : "hover:bg-gray-100 text-text-main/40"
            )}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col">
            <Breadcrumb
              items={[
                { label: '首页', path: Routes.Home },
                { label: '对话', path: Routes.Chats },
                { label: conversation.title }
              ]}
              darkMode={darkMode}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePin}
            className={cn(
              "p-2 rounded-xl transition-colors",
              darkMode
                ? "hover:bg-[#2d2d2d] text-[#858585]"
                : "hover:bg-gray-100 text-text-main/40"
            )}
          >
            {conversation.isPinned ? <PinOff size={18} /> : <Pin size={18} />}
          </button>
          <button
            onClick={handleDelete}
            className={cn(
              "p-2 rounded-xl transition-colors",
              darkMode
                ? "hover:bg-[#2d2d2d] text-[#858585]"
                : "hover:bg-gray-100 text-text-main/40"
            )}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className={cn(
            "rounded-2xl p-4 text-sm",
            darkMode
              ? "bg-[#2d2d2d] border border-[#3c3c3c] text-[#cccccc]"
              : "bg-amber-50 border border-amber-200 text-amber-800"
          )}>
            当前页面已接通会话列表、历史消息和删除能力；发送消息、置顶能力仍依赖后端补接口。
          </div>
          {messages.length === 0 ? (
            <div className={cn(
              "text-center py-12 rounded-2xl",
              darkMode ? "bg-[#2d2d2d] border border-[#3c3c3c]" : "art-card"
            )}>
              <p className={cn("mono-label mb-2", darkMode ? "text-[#858585]" : "")}>开始对话</p>
              <p className={cn("text-sm", darkMode ? "text-[#858585]" : "text-text-main/50")}>
                输入消息开始与 AI 对话
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-2xl p-4",
                  msg.role === 'user'
                    ? darkMode
                      ? "bg-[#094771] ml-12"
                      : "bg-primary/10 mr-12"
                    : darkMode
                      ? "bg-[#2d2d2d] border border-[#3c3c3c] mr-12"
                      : "art-card ml-12"
                )}
              >
                <p className={cn(
                  "text-sm leading-relaxed",
                  msg.role === 'user'
                    ? darkMode ? "text-white" : "text-text-main"
                    : darkMode ? "text-[#e0e0e0]" : "text-text-main"
                )}>
                  {msg.content}
                </p>
                <p className={cn("mono-label mt-2 text-[8px]", darkMode ? "text-[#6b6b6b]" : "text-text-main/30")}>
                  {msg.createdAt}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Input */}
      <div className={cn(
        "p-4 shrink-0 border-t",
        darkMode ? "bg-[#252526] border-[#3c3c3c]" : "bg-white/80 border-border-subtle"
      )}>
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="发送能力待后端接口补齐"
            className={cn(
              "flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none",
              darkMode
                ? "bg-[#2d2d2d] border border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]"
                : "bg-bg-base/50 border border-border-subtle"
            )}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className={cn(
              "p-3 rounded-xl transition-colors",
              inputValue.trim()
                ? darkMode
                  ? "bg-[#094771] text-white hover:bg-[#0a5280]"
                  : "bg-primary text-white hover:bg-primary/90"
                : darkMode
                  ? "bg-[#3c3c3c] text-[#6b6b6b] cursor-not-allowed"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
