import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KNOWLEDGE_FILE_ACCEPT } from '@/lib/knowledge-file';

export type KnowledgeImportMode = 'files' | 'zip' | 'folder';

export interface KnowledgeImportPreviewItem {
  key: string;
  name: string;
  path: string;
  size: number;
  assetCount: number;
  localReferenceCount: number;
  duplicate: boolean;
}

interface KnowledgeFileImportDialogProps {
  open: boolean;
  sourceLabel: string;
  items: KnowledgeImportPreviewItem[];
  selectedKeys: Set<string>;
  preparing: boolean;
  uploading: boolean;
  onClose: () => void;
  onSelectFiles: (mode: KnowledgeImportMode, files: File[]) => void;
  onDropFiles: (files: File[]) => void;
  onRemoveItem: (key: string) => void;
  onToggleItem: (key: string) => void;
  onToggleAll: (selected: boolean) => void;
  onUpload: () => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const modeOptions: Array<{
  mode: KnowledgeImportMode;
  label: string;
}> = [
  { mode: 'files', label: '文件' },
  { mode: 'zip', label: 'ZIP' },
  { mode: 'folder', label: '文件夹' },
];

export function KnowledgeFileImportDialog({
  open,
  sourceLabel,
  items,
  selectedKeys,
  preparing,
  uploading,
  onClose,
  onSelectFiles,
  onDropFiles,
  onRemoveItem,
  onToggleItem,
  onToggleAll,
  onUpload,
}: KnowledgeFileImportDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedMode, setSelectedMode] = useState<KnowledgeImportMode>('files');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const zipInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const attachFolderInputRef = useCallback((input: HTMLInputElement | null) => {
    folderInputRef.current = input;
    if (!input) return;
    input.webkitdirectory = true;
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
  }, []);
  const selectableItems = items.filter((item) => !item.duplicate);
  const allSelected = selectableItems.length > 0 && selectableItems.every((item) => selectedKeys.has(item.key));
  const selectedCount = selectableItems.filter((item) => selectedKeys.has(item.key)).length;
  const selectedModeLabel = modeOptions.find((option) => option.mode === selectedMode)?.label ?? '文件';

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !uploading) onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open, uploading]);

  if (!open) return null;

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (preparing || uploading) return;
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) onDropFiles(files);
  }

  function openSelectedPicker() {
    if (preparing || uploading) return;
    if (selectedMode === 'files') fileInputRef.current?.click();
    if (selectedMode === 'zip') zipInputRef.current?.click();
    if (selectedMode === 'folder') folderInputRef.current?.click();
  }

  function handleSelectedFiles(mode: KnowledgeImportMode, event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length > 0) onSelectFiles(mode, files);
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-3 py-4 sm:px-6 sm:py-8">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={uploading ? undefined : onClose}
        aria-label="关闭上传文件弹窗"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="knowledge-file-import-title"
        className="relative flex max-h-full w-full max-w-[1040px] flex-col overflow-hidden rounded-2xl bg-bg-card-solid shadow-dialog"
      >
        <header className="flex shrink-0 items-center justify-between px-5 pt-4 pb-2 sm:px-6">
          <h2 id="knowledge-file-import-title" className="text-lg font-semibold leading-7 text-ink">
            上传知识文件
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="inline-flex h-9 w-9 items-center justify-center text-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </header>

        <input
          ref={fileInputRef}
          data-testid="knowledge-import-file-input"
          type="file"
          multiple
          accept={KNOWLEDGE_FILE_ACCEPT}
          className="hidden"
          onChange={(event) => handleSelectedFiles('files', event)}
        />
        <input
          ref={zipInputRef}
          data-testid="knowledge-import-zip-input"
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(event) => handleSelectedFiles('zip', event)}
        />
        <input
          ref={attachFolderInputRef}
          data-testid="knowledge-import-folder-input"
          type="file"
          multiple
          className="hidden"
          onChange={(event) => handleSelectedFiles('folder', event)}
        />

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 py-4 sm:grid-cols-2 sm:gap-0 sm:overflow-hidden sm:px-6">
          <div className="flex min-w-0 flex-col sm:pr-6">
            <div className="flex h-8 shrink-0 items-center pb-3">
              <h3 className="text-sm font-semibold leading-5 text-ink">上传文件</h3>
            </div>

            <div
              className={cn(
                'flex h-80 min-h-80 w-full flex-col overflow-hidden rounded-xl border border-dashed text-center transition-colors',
                dragActive ? 'border-primary/45 bg-primary/[0.035]' : 'border-hairline',
              )}
              onDragEnter={(event) => {
                event.preventDefault();
                if (!preparing && !uploading) setDragActive(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false);
              }}
              onDrop={handleDrop}
            >
              <button
                type="button"
                aria-label={`选择${selectedModeLabel}`}
                className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 text-ink transition-colors hover:text-primary"
                onClick={openSelectedPicker}
              >
                <div className="flex h-10 w-10 items-center justify-center text-primary">
                  {preparing ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}
                </div>
                <p className="mt-3 text-sm font-semibold text-ink">
                  {preparing ? '正在读取...' : `拖拽到这里，或点击选择${selectedModeLabel}`}
                </p>
              </button>

              <div className="flex shrink-0 items-center justify-center gap-2 px-4 pb-5 text-xs text-muted">
                {modeOptions.map((option, index) => (
                  <div key={option.mode} className="flex items-center gap-2">
                    {index > 0 && <span aria-hidden="true">·</span>}
                    <button
                      type="button"
                      aria-pressed={selectedMode === option.mode}
                      onClick={() => setSelectedMode(option.mode)}
                      disabled={preparing || uploading}
                      className={cn(
                        'transition-colors hover:text-ink disabled:cursor-wait disabled:opacity-60',
                        selectedMode === option.mode && 'font-semibold text-primary',
                      )}
                    >
                      {option.label}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col pt-5 sm:pl-6 sm:pt-0">
            <div className="flex h-8 shrink-0 items-center justify-between pb-3">
              <p className="min-w-0 truncate text-sm font-semibold text-ink">
                待上传文件
                {sourceLabel && <span className="font-normal text-muted"> · {sourceLabel}</span>}
              </p>
              {selectableItems.length > 0 && (
                <label className="ml-4 flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium text-text-secondary">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(event) => onToggleAll(event.target.checked)}
                    disabled={uploading}
                    className="h-4 w-4 accent-primary"
                  />
                  全选
                </label>
              )}
            </div>

            <div className="h-80 min-h-80 overflow-y-auto rounded-xl border border-dashed border-hairline p-2">
              {preparing ? (
                <div className="flex h-full flex-col items-center justify-center text-muted">
                  <Loader2 size={20} className="animate-spin" />
                  <p className="mt-2 text-xs">正在分析文件</p>
                </div>
              ) : items.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center">
                  <p className="text-sm text-muted">选择后，文件会显示在这里</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {items.map((item) => {
                    const selected = selectedKeys.has(item.key);
                    return (
                      <div
                        key={item.key}
                        className="flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-soft/70"
                      >
                        <label
                          className={cn(
                            'flex min-w-0 flex-1 items-center gap-2.5 py-1',
                            item.duplicate ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                            selected && !item.duplicate && 'text-ink',
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => onToggleItem(item.key)}
                            disabled={item.duplicate || uploading}
                            className="h-4 w-4 shrink-0 accent-primary"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{item.name}</p>
                              <span className="shrink-0 text-[10px] text-muted">{formatFileSize(item.size)}</span>
                              {item.duplicate && <span className="shrink-0 text-[10px] text-[#9a6b18]">已存在</span>}
                            </div>
                            {(item.path !== item.name || item.localReferenceCount > 0) && (
                              <p className="mt-1 truncate font-mono text-[10px] text-muted">
                                {item.path !== item.name ? item.path : ''}
                                {item.path !== item.name && item.localReferenceCount > 0 ? ' · ' : ''}
                                {item.localReferenceCount > 0
                                  ? `本地图片 ${item.assetCount}/${item.localReferenceCount}`
                                  : ''}
                              </p>
                            )}
                          </div>
                        </label>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.key)}
                          disabled={uploading}
                          aria-label={`移除 ${item.name}`}
                          title="从候选文件中移除"
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-4 px-5 pt-2 pb-5 sm:px-6">
          <p className="text-xs text-muted">已选择 {selectedCount} 个文件</p>
          <button
            type="button"
            onClick={onUpload}
            disabled={selectedCount === 0 || preparing || uploading}
            className="inline-flex h-10 min-w-28 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading && <Loader2 size={15} className="animate-spin" />}
            {uploading ? '上传中' : `上传 ${selectedCount || ''}`.trim()}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
