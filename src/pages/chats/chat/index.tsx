import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Send, Pin, PinOff, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Routes } from '@/routes';
import { getMessages, getConversations, deleteConversation, sendMessage, updateConversation } from '@/services/chat';
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
  const [sending, setSending] = useState(false);
  const [pinning, setPinning] = useState(false);

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
    if (!conversation) return;
    const content = inputValue.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      const message = await sendMessage(conversation.id, content);
      setMessages((prev) => [...prev, message]);
      setInputValue('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handlePin = async () => {
    if (!conversation || pinning) return;
    setPinning(true);
    try {
      const updated = await updateConversation(conversation.id, { isPinned: !conversation.isPinned });
      setConversation(updated);
    } catch (error) {
      console.error('Failed to update conversation:', error);
    } finally {
      setPinning(false);
    }
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
            disabled={pinning}
            className={cn(
              "p-2 rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-60",
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
                      ? "bg-[#2d2d2d] border border-[#3c3c3c] ml-12"
                      : "bg-bg-base/70 border border-border-subtle mr-12"
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
            placeholder="输入消息..."
            disabled={sending}
            className={cn(
              "flex-1 px-4 py-3 rounded-xl text-sm focus:outline-none",
              darkMode
                ? "bg-[#1e1e1e] border border-[#3c3c3c] text-[#e0e0e0] placeholder:text-[#6b6b6b]"
                : "bg-bg-base/50 border border-border-subtle text-text-main"
            )}
          />
          <button
            onClick={handleSend}
            disabled={sending || !inputValue.trim()}
            className={cn(
              "p-3 rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              "bg-text-main text-white hover:opacity-90"
            )}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
