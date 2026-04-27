import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Plus, FileText, MessageSquare, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Routes } from '@/routes';
import { getDataset, getKnowledgeFiles, deleteDataset } from '@/services/dataset';
import { getConversations } from '@/services/chat';
import type { DatasetDTO, KnowledgeFileDTO, ConversationDTO } from '@/types/api';

interface DatasetPageProps {
  darkMode?: boolean;
}

export default function DatasetPage({ darkMode }: DatasetPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dataset, setDataset] = useState<DatasetDTO | null>(null);
  const [files, setFiles] = useState<KnowledgeFileDTO[]>([]);
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'files' | 'conversations'>('files');

  useEffect(() => {
    if (id) {
      loadDataset();
    }
  }, [id]);

  const loadDataset = async () => {
    if (!id) return;
    try {
      const ds = await getDataset(Number(id));
      setDataset(ds);

      const [filesResult, convResult] = await Promise.all([
        getKnowledgeFiles(ds.id, 1, 100),
        getConversations(1, 100),
      ]);

      setFiles(filesResult.items);
      // 过滤出属于该数据集的对话
      const dsConversations = convResult.items.filter((c) => c.datasetId === ds.id);
      setConversations(dsConversations);
    } catch (error) {
      console.error('Failed to load dataset:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!dataset) return;
    if (!confirm('确定要删除这个数据集吗？删除后无法恢复。')) return;
    try {
      await deleteDataset(dataset.id);
      navigate(Routes.Datasets);
    } catch (error) {
      console.error('Failed to delete dataset:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className={cn("mono-label", darkMode ? "text-[#858585]" : "")}>加载中...</div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className={cn("text-lg mb-4", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>数据集不存在</p>
        <button
          onClick={() => navigate(Routes.Datasets)}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider",
            darkMode
              ? "bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c]"
              : "bg-text-main text-white hover:opacity-90"
          )}
        >
          返回数据集列表
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className={cn(
        "h-20 px-8 flex items-center justify-between shrink-0 border-b",
        darkMode ? "bg-[#252526] border-[#3c3c3c]" : "bg-white/80 border-border-subtle"
      )}>
        <div className="flex flex-col gap-1">
          <Breadcrumb
            items={[
              { label: '首页', path: Routes.Home },
              { label: '知识库', path: Routes.Datasets },
              { label: dataset.name }
            ]}
            darkMode={darkMode}
          />
          <h2 className={cn("text-xl serif-heading", darkMode ? "text-[#e0e0e0]" : "text-text-main")}>
            {dataset.name}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(Routes.Chats, { state: { datasetId: dataset.id } })}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors",
              darkMode
                ? "bg-[#2d2d2d] text-[#cccccc] hover:bg-[#3c3c3c] border border-[#3c3c3c]"
                : "bg-white border border-border-subtle hover:border-primary"
            )}
          >
            <MessageSquare size={14} />
            新建对话
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

      {/* Tabs */}
      <div className={cn(
        "px-8 flex gap-4 shrink-0 border-b",
        darkMode ? "bg-[#252526] border-[#3c3c3c]" : "bg-white/50 border-border-subtle"
      )}>
        <button
          onClick={() => setActiveTab('files')}
          className={cn(
            "py-3 px-1 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors",
            activeTab === 'files'
              ? "border-[#c586c0] text-[#c586c0]"
              : darkMode
                ? "border-transparent text-[#858585] hover:text-[#cccccc]"
                : "border-transparent text-text-main/50 hover:text-text-main"
          )}
        >
          知识文件 ({files.length})
        </button>
        <button
          onClick={() => setActiveTab('conversations')}
          className={cn(
            "py-3 px-1 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors",
            activeTab === 'conversations'
              ? "border-[#c586c0] text-[#c586c0]"
              : darkMode
                ? "border-transparent text-[#858585] hover:text-[#cccccc]"
                : "border-transparent text-text-main/50 hover:text-text-main"
          )}
        >
          关联对话 ({conversations.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'files' ? (
          <div className="space-y-3">
            {files.length === 0 ? (
              <div className={cn(
                "text-center py-12 rounded-2xl",
                darkMode ? "bg-[#2d2d2d] border border-[#3c3c3c]" : "art-card"
              )}>
                <FileText size={32} className={cn("mx-auto mb-3", darkMode ? "text-[#6b6b6b]" : "text-text-main/20")} />
                <p className={cn("mono-label mb-2", darkMode ? "text-[#858585]" : "")}>暂无知识文件</p>
                <p className={cn("text-sm", darkMode ? "text-[#858585]" : "text-text-main/50")}>
                  上传文件到该数据集
                </p>
              </div>
            ) : (
              files.map((file) => (
                <div
                  key={file.id}
                  className={cn(
                    "rounded-xl p-4 flex items-center justify-between",
                    darkMode ? "bg-[#2d2d2d] border border-[#3c3c3c]" : "art-card"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      darkMode ? "bg-[#3c3c3c]" : "bg-primary/10"
                    )}>
                      <FileText size={18} className={darkMode ? "text-[#858585]" : "text-primary"} />
                    </div>
                    <div>
                      <p className={cn("text-sm font-bold", darkMode ? "text-[#e0e0e0]" : "")}>
                        {file.originalFilename}
                      </p>
                      <p className={cn("mono-label text-[10px]", darkMode ? "text-[#858585]" : "text-text-main/50")}>
                        {file.fileSuffix} · {Math.round(file.fileSize / 1024)} KB · {file.uploadStatus}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                      file.parseStatus === 'SUCCESS'
                        ? darkMode
                          ? "bg-green-900/50 text-green-400"
                          : "bg-green-100 text-green-600"
                        : file.parseStatus === 'FAILED'
                          ? darkMode
                            ? "bg-red-900/50 text-red-400"
                            : "bg-red-100 text-red-600"
                          : darkMode
                            ? "bg-yellow-900/50 text-yellow-400"
                            : "bg-yellow-100 text-yellow-600"
                    )}>
                      {file.parseStatus}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.length === 0 ? (
              <div className={cn(
                "text-center py-12 rounded-2xl",
                darkMode ? "bg-[#2d2d2d] border border-[#3c3c3c]" : "art-card"
              )}>
                <MessageSquare size={32} className={cn("mx-auto mb-3", darkMode ? "text-[#6b6b6b]" : "text-text-main/20")} />
                <p className={cn("mono-label mb-2", darkMode ? "text-[#858585]" : "")}>暂无关联对话</p>
                <p className={cn("text-sm", darkMode ? "text-[#858585]" : "text-text-main/50")}>
                  创建对话时关联该数据集
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => navigate(`/chats/${conv.id}`)}
                  className={cn(
                    "rounded-xl p-4 flex items-center justify-between cursor-pointer transition-colors",
                    darkMode
                      ? "bg-[#2d2d2d] border border-[#3c3c3c] hover:border-[#c586c0]"
                      : "art-card hover:border-primary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      darkMode ? "bg-purple-900/30" : "bg-purple-100"
                    )}>
                      <MessageSquare size={18} className={darkMode ? "text-purple-400" : "text-purple-500"} />
                    </div>
                    <div>
                      <p className={cn("text-sm font-bold", darkMode ? "text-[#e0e0e0]" : "")}>
                        {conv.title}
                      </p>
                      <p className={cn("mono-label text-[10px]", darkMode ? "text-[#858585]" : "text-text-main/50")}>
                        更新于 {conv.updatedAt}
                      </p>
                    </div>
                  </div>
                  {conv.isPinned && (
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                      darkMode ? "bg-[#094771] text-blue-400" : "bg-blue-100 text-blue-600"
                    )}>
                      已置顶
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}