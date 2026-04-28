import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ChevronDown, FileSpreadsheet, FileText, Presentation, RefreshCw, Search, Trash2, Upload, Wand2 } from 'lucide-react';
import { Routes } from '@/routes';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/Breadcrumb';
import { DatasetBadgeList } from '@/components/DatasetBadge';
import {
  createParseTask,
  deleteKnowledgeFile,
  getDatasets,
  getKnowledgeFiles,
  uploadKnowledgeFile,
} from '@/services/dataset';
import type { DatasetDTO, KnowledgeFileDTO } from '@/types/api';

const FILE_TYPES: Record<string, typeof FileText> = {
  PDF: FileText,
  DOCX: FileText,
  PPTX: Presentation,
  XLSX: FileSpreadsheet,
};

interface FileWithDataset extends KnowledgeFileDTO {
  dataset: DatasetDTO;
}

interface FilesPageProps {
  darkMode?: boolean;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN');
}

function getFileStatus(file: KnowledgeFileDTO) {
  if (file.failureReason) {
    return '上传失败';
  }
  if (file.parseStatus) {
    return file.parseStatus;
  }
  return file.uploadStatus;
}

export default function FilesPage({ darkMode }: FilesPageProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [searchString, setSearchString] = useState('');
  const [files, setFiles] = useState<FileWithDataset[]>([]);
  const [datasets, setDatasets] = useState<DatasetDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [uploadDatasetId, setUploadDatasetId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    try {
      const dsResult = await getDatasets(1, 100);
      setDatasets(dsResult.items);

      const nestedResults = await Promise.all(
        dsResult.items.map(async (dataset) => {
          const filesResult = await getKnowledgeFiles(dataset.id, 1, 100);
          return filesResult.items.map((file) => ({ ...file, dataset }));
        })
      );

      const merged = nestedResults.flat().sort((a, b) => b.id - a.id);
      setFiles(merged);
      setUploadDatasetId(dsResult.items[0]?.id ?? null);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !uploadDatasetId) {
      return;
    }

    setUploading(true);
    try {
      await uploadKnowledgeFile(uploadDatasetId, file);
      await loadData();
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(fileId: number) {
    if (!confirm('确定删除这个文件吗？')) return;
    try {
      await deleteKnowledgeFile(fileId);
      setFiles((prev) => prev.filter((item) => item.id !== fileId));
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  }

  async function handleParse(fileId: number) {
    try {
      await createParseTask(fileId);
      await loadData();
    } catch (error) {
      console.error('Failed to parse file:', error);
    }
  }

  const visibleFiles = useMemo(() => {
    return files.filter((file) => {
      const matchesSearch = file.originalFilename.toLowerCase().includes(searchString.toLowerCase());
      const matchesDataset = selectedDatasetId === null || file.dataset.id === selectedDatasetId;
      return matchesSearch && matchesDataset;
    });
  }, [files, searchString, selectedDatasetId]);

  return (
    <div className="h-full flex flex-col">
      <header
        className={cn(
          'h-20 px-8 flex items-center justify-between shrink-0 backdrop-blur-md',
          darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-border-subtle border-b'
        )}
      >
        <div className="flex flex-col gap-1">
          <Breadcrumb items={[{ label: '首页', path: Routes.Home }, { label: '文件' }]} darkMode={darkMode} />
          <h2 className={cn('text-xl serif-heading', darkMode && 'text-gray-100')}>文件</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className={cn('absolute left-3 top-1/2 -translate-y-1/2', darkMode ? 'text-gray-400' : 'text-text-main/30')} />
            <input
              type="text"
              placeholder="搜索文件..."
              value={searchString}
              onChange={(event) => setSearchString(event.target.value)}
              className={cn(
                'w-48 pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-primary',
                darkMode ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500' : 'bg-bg-base/50 border-border-subtle'
              )}
            />
          </div>
          <select
            value={selectedDatasetId ?? ''}
            onChange={(event) => setSelectedDatasetId(event.target.value ? Number(event.target.value) : null)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs focus:outline-none',
              darkMode ? 'bg-gray-800 border border-gray-700 text-gray-100' : 'bg-white border border-border-subtle'
            )}
          >
            <option value="">全部知识库</option>
            {datasets.map((dataset) => (
              <option key={dataset.id} value={dataset.id}>
                {dataset.name}
              </option>
            ))}
          </select>
          <select
            value={uploadDatasetId ?? ''}
            onChange={(event) => setUploadDatasetId(event.target.value ? Number(event.target.value) : null)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs focus:outline-none',
              darkMode ? 'bg-gray-800 border border-gray-700 text-gray-100' : 'bg-white border border-border-subtle'
            )}
          >
            <option value="">选择上传目标</option>
            {datasets.map((dataset) => (
              <option key={dataset.id} value={dataset.id}>
                {dataset.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => void loadData()}
            className={cn(
              'p-2 rounded-xl transition-colors',
              darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-text-main/50 hover:bg-primary/5'
            )}
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={!uploadDatasetId || uploading}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl transition-opacity',
              darkMode ? 'bg-[#094771] text-white hover:bg-[#0a5280]' : 'bg-text-main text-white hover:opacity-90',
              (!uploadDatasetId || uploading) && 'opacity-60'
            )}
          >
            <Upload size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">{uploading ? '上传中' : '上传'}</span>
          </button>
          <input ref={inputRef} type="file" className="hidden" onChange={handleUpload} />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className={cn('flex items-center gap-6 mb-6 mono-label', darkMode && 'text-gray-400')}>
          <span>共 {visibleFiles.length} 个文件</span>
          <span className={darkMode ? 'text-gray-600' : 'text-border-subtle'}>|</span>
          <span>按后端真实接口展示</span>
        </div>

        {loading ? (
          <div className={cn('mono-label', darkMode ? 'text-gray-400' : 'text-text-main/40')}>加载中...</div>
        ) : visibleFiles.length === 0 ? (
          <div
            className={cn(
              'rounded-2xl p-10 text-center',
              darkMode ? 'bg-gray-800/50 border border-gray-700' : 'art-card'
            )}
          >
            <FileText size={28} className={cn('mx-auto mb-3', darkMode ? 'text-gray-500' : 'text-text-main/20')} />
            <p className={cn('mono-label mb-2', darkMode ? 'text-gray-400' : '')}>暂无文件</p>
            <p className={cn('text-sm', darkMode ? 'text-gray-500' : 'text-text-main/50')}>先选择知识库，再上传一个文件</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleFiles.map((file) => {
              const fileType = file.originalFilename.split('.').pop()?.toUpperCase() || file.fileSuffix.toUpperCase();
              const FileIcon = FILE_TYPES[fileType] || FileText;

              return (
                <div
                  key={file.id}
                  className={cn(
                    'rounded-xl px-4 py-3 transition-colors',
                    darkMode ? 'bg-gray-800/50 border border-gray-700/50' : 'art-card'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', darkMode ? 'bg-gray-700' : 'bg-primary/10')}>
                      <FileIcon size={14} className={darkMode ? 'text-gray-100' : 'text-primary'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className={cn('text-xs font-bold uppercase tracking-wider truncate', darkMode ? 'text-gray-100' : 'text-text-main')}>
                          {file.originalFilename}
                        </span>
                        <span className={cn('mono-label shrink-0', darkMode ? 'text-gray-500' : 'text-text-main/30')}>
                          {getFileStatus(file)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <DatasetBadgeList
                          items={[{ kb_id: String(file.dataset.id), kb_name: file.dataset.name }]}
                          darkMode={darkMode}
                          maxShow={1}
                        />
                        <span className={cn('mono-label', darkMode ? 'text-gray-400' : '')}>{fileType}</span>
                        <span className={cn('mono-label', darkMode ? 'text-gray-400' : '')}>{formatFileSize(file.fileSize)}</span>
                        <span className={cn('mono-label hidden sm:block', darkMode ? 'text-gray-500' : 'text-text-main/30')}>
                          {formatDate(file.createdAt)}
                        </span>
                      </div>
                      {file.failureReason && <p className="text-xs text-red-500 mt-1">{file.failureReason}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => void handleParse(file.id)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider',
                          darkMode ? 'bg-[#094771] text-white hover:bg-[#0a5280]' : 'bg-primary text-white hover:bg-primary/90'
                        )}
                      >
                        <Wand2 size={12} />
                        解析
                      </button>
                      <button
                        onClick={() => void handleDelete(file.id)}
                        className={cn(
                          'p-2 rounded-xl transition-colors',
                          darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-text-main/40 hover:bg-gray-100'
                        )}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
