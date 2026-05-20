import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { Link } from 'react-router';
import { ArrowRight, CheckCircle2, ChevronDown, FileUp, MessageSquareText, Paperclip, X } from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { cn } from '@/lib/utils';
import { Routes } from '@/routes';
import { useTheme } from '@/contexts/ThemeContext';

const feedbackTypes = ['功能建议', '问题反馈', '体验优化', '内容纠错'];
const priorityOptions = ['普通', '希望尽快处理', '影响使用'];

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function FeedbackPage() {
  const { darkMode } = useTheme();
  const [submitted, setSubmitted] = useState(false);
  const [type, setType] = useState(feedbackTypes[0]);
  const [priority, setPriority] = useState(priorityOptions[0]);
  const [openDropdown, setOpenDropdown] = useState<'type' | 'priority' | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [draggingAttachment, setDraggingAttachment] = useState(false);
  const [form, setForm] = useState({
    title: '',
    contact: '',
    content: '',
  });
  const typeDropdownRef = useRef<HTMLDivElement | null>(null);
  const priorityDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (typeDropdownRef.current?.contains(target)) return;
      if (priorityDropdownRef.current?.contains(target)) return;
      setOpenDropdown(null);
    }

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  function addAttachments(fileList: FileList | null) {
    if (!fileList) return;
    const nextFiles = Array.from(fileList);
    setAttachments((prev) => {
      const known = new Set(prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      return [...prev, ...nextFiles.filter((file) => !known.has(`${file.name}-${file.size}-${file.lastModified}`))];
    });
  }

  function handleAttachmentDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDraggingAttachment(false);
    addAttachments(event.dataTransfer.files);
  }

  function removeAttachment(fileToRemove: File) {
    setAttachments((prev) => prev.filter((file) => file !== fileToRemove));
  }

  const showUploadPrompt = !form.content && attachments.length === 0;

  return (
    <div className={cn('min-h-screen', darkMode ? 'bg-[#151515] text-[#cccccc]' : 'bg-bg-base text-text-main')}>
      <header
        className={cn(
          'sticky top-0 z-20 border-b px-6 py-2.5 backdrop-blur-md lg:px-10',
          darkMode ? 'border-[#282828] bg-[#151515]/92' : 'border-border-subtle bg-bg-base/86',
        )}
      >
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Breadcrumb items={[{ label: '首页', path: Routes.Welcome }, { label: '反馈' }]} darkMode={darkMode} />
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl border',
                  darkMode ? 'border-[#303030] bg-[#202020]' : 'border-border-subtle bg-white/70',
                )}
              >
                <MessageSquareText size={16} className={darkMode ? 'text-cyan-300' : 'text-primary'} />
              </div>
              <div>
                <p className={cn('mono-label mb-0.5 text-[10px] leading-none', darkMode ? 'text-[#858585]' : '')}>
                  product feedback
                </p>
                <h1
                  className={cn(
                    'text-[30px] leading-none font-bold tracking-tight',
                    darkMode ? 'text-[#f2f2f2]' : 'text-text-main',
                  )}
                >
                  反馈
                </h1>
              </div>
            </div>
          </div>
          <Link
            to={Routes.Welcome}
            className={cn(
              'group hidden items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] transition-all sm:inline-flex',
              darkMode
                ? 'border-[#3a3a3a] bg-[linear-gradient(135deg,#202020,#262626)] text-[#d7d7d7] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-[#4a4a4a] hover:text-[#f1f1f1] hover:shadow-[0_6px_18px_rgba(0,0,0,0.26)]'
                : 'border-border-subtle bg-[linear-gradient(135deg,#ffffff,#f5f2ee)] text-text-main shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] hover:border-text-main/20 hover:shadow-[0_6px_18px_rgba(42,33,24,0.08)]',
            )}
          >
            <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            返回入口
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[760px] px-6 py-8 lg:py-10">
        <section className="mx-auto mb-7 w-full max-w-[680px]">
          <p className={cn('text-sm leading-7', darkMode ? 'text-[#9d9d9d]' : 'text-text-main/58')}>
            写下你遇到的问题、建议或希望改进的细节。描述越具体，后续越容易处理。
          </p>
        </section>

        <section className="mx-auto w-full max-w-[680px]">
          {submitted ? (
            <div
              className={cn(
                'rounded-2xl border px-6 py-8 text-center',
                darkMode ? 'border-[#303030] bg-[#202020]' : 'border-border-subtle bg-white/70',
              )}
            >
              <div
                className={cn(
                  'mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl',
                  darkMode ? 'bg-cyan-400/12 text-cyan-200' : 'bg-primary/12 text-primary',
                )}
              >
                <CheckCircle2 size={22} />
              </div>
              <h2 className={cn('text-xl font-bold tracking-tight', darkMode ? 'text-[#f1f1f1]' : 'text-text-main')}>
                反馈已记录
              </h2>
              <p
                className={cn(
                  'mx-auto mt-3 max-w-[420px] text-sm leading-7',
                  darkMode ? 'text-[#9b9b9b]' : 'text-text-main/55',
                )}
              >
                谢谢你的反馈。{attachments.length > 0 ? `已附带 ${attachments.length} 个文件。` : ''}
                后续接入接口后，这里可以直接提交到后端或 GitHub issue。
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setAttachments([]);
                }}
                className={cn(
                  'mt-6 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-[0.22em] transition-colors',
                  darkMode
                    ? 'bg-[#2d2d2d] text-[#e0e0e0] hover:bg-[#3a3a3a]'
                    : 'bg-bg-base text-text-main hover:bg-white',
                )}
              >
                再写一条
              </button>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 max-[700px]:grid-cols-1">
                <label className="block">
                  <span
                    className={cn(
                      'mb-2 block text-xs font-bold uppercase tracking-[0.22em]',
                      darkMode ? 'text-[#b5b5b5]' : 'text-text-main/60',
                    )}
                  >
                    类型
                  </span>
                  <div ref={typeDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown((prev) => (prev === 'type' ? null : 'type'))}
                      className={cn(
                        'flex h-12 w-full items-center justify-between rounded-xl px-4.5 text-sm outline-none transition-colors',
                        darkMode
                          ? 'border border-[#303030] bg-[#202020] text-[#e0e0e0] hover:border-[#444] focus:border-cyan-300/55'
                          : 'border border-border-subtle bg-white/78 text-text-main shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] hover:border-text-main/15 focus:border-primary/60',
                      )}
                    >
                      <span>{type}</span>
                      <ChevronDown
                        size={15}
                        className={cn(
                          'transition-transform',
                          openDropdown === 'type' && 'rotate-180',
                          darkMode ? 'text-[#858585]' : 'text-text-main/45',
                        )}
                      />
                    </button>
                    {openDropdown === 'type' && (
                      <div
                        className={cn(
                          'absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border backdrop-blur-md',
                          darkMode
                            ? 'border-[#3a3a3a] bg-[#1f1f1f]/98 shadow-[0_16px_40px_rgba(0,0,0,0.35)]'
                            : 'border-border-subtle bg-white/96 shadow-[0_16px_40px_rgba(42,33,24,0.12)]',
                        )}
                      >
                        {feedbackTypes.map((item) => {
                          const active = item === type;
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => {
                                setType(item);
                                setOpenDropdown(null);
                              }}
                              className={cn(
                                'flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors',
                                active
                                  ? darkMode
                                    ? 'bg-cyan-400/10 text-[#f2f2f2]'
                                    : 'bg-primary/8 text-text-main'
                                  : darkMode
                                    ? 'text-[#d7d7d7] hover:bg-[#292929]'
                                    : 'text-text-main/70 hover:bg-bg-base/70',
                              )}
                            >
                              <span>{item}</span>
                              {active && (
                                <span
                                  className={cn(
                                    'text-[10px] font-bold uppercase tracking-[0.22em]',
                                    darkMode ? 'text-cyan-200' : 'text-primary',
                                  )}
                                >
                                  当前
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </label>

                <label className="block">
                  <span
                    className={cn(
                      'mb-2 block text-xs font-bold uppercase tracking-[0.22em]',
                      darkMode ? 'text-[#b5b5b5]' : 'text-text-main/60',
                    )}
                  >
                    优先级
                  </span>
                  <div ref={priorityDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown((prev) => (prev === 'priority' ? null : 'priority'))}
                      className={cn(
                        'flex h-12 w-full items-center justify-between rounded-xl px-4.5 text-sm outline-none transition-colors',
                        darkMode
                          ? 'border border-[#303030] bg-[#202020] text-[#e0e0e0] hover:border-[#444] focus:border-cyan-300/55'
                          : 'border border-border-subtle bg-white/78 text-text-main shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] hover:border-text-main/15 focus:border-primary/60',
                      )}
                    >
                      <span>{priority}</span>
                      <ChevronDown
                        size={15}
                        className={cn(
                          'transition-transform',
                          openDropdown === 'priority' && 'rotate-180',
                          darkMode ? 'text-[#858585]' : 'text-text-main/45',
                        )}
                      />
                    </button>
                    {openDropdown === 'priority' && (
                      <div
                        className={cn(
                          'absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border backdrop-blur-md',
                          darkMode
                            ? 'border-[#3a3a3a] bg-[#1f1f1f]/98 shadow-[0_16px_40px_rgba(0,0,0,0.35)]'
                            : 'border-border-subtle bg-white/96 shadow-[0_16px_40px_rgba(42,33,24,0.12)]',
                        )}
                      >
                        {priorityOptions.map((item) => {
                          const active = item === priority;
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => {
                                setPriority(item);
                                setOpenDropdown(null);
                              }}
                              className={cn(
                                'flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors',
                                active
                                  ? darkMode
                                    ? 'bg-cyan-400/10 text-[#f2f2f2]'
                                    : 'bg-primary/8 text-text-main'
                                  : darkMode
                                    ? 'text-[#d7d7d7] hover:bg-[#292929]'
                                    : 'text-text-main/70 hover:bg-bg-base/70',
                              )}
                            >
                              <span>{item}</span>
                              {active && (
                                <span
                                  className={cn(
                                    'text-[10px] font-bold uppercase tracking-[0.22em]',
                                    darkMode ? 'text-cyan-200' : 'text-primary',
                                  )}
                                >
                                  当前
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </label>
                <label className="block">
                  <span
                    className={cn(
                      'mb-2 block text-xs font-bold uppercase tracking-[0.22em]',
                      darkMode ? 'text-[#b5b5b5]' : 'text-text-main/60',
                    )}
                  >
                    标题
                  </span>
                  <input
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    required
                    placeholder="一句话描述你的反馈"
                    className={cn(
                      'h-12 w-full rounded-xl px-4.5 text-sm outline-none transition-colors focus:border-primary/60',
                      darkMode
                        ? 'border border-[#303030] bg-[#202020] text-[#e0e0e0] placeholder:text-[#6b6b6b] focus:border-cyan-300/55'
                        : 'border border-border-subtle bg-white/78 placeholder:text-text-main/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]',
                    )}
                  />
                </label>

                <label className="block">
                  <span
                    className={cn(
                      'mb-2 block text-xs font-bold uppercase tracking-[0.22em]',
                      darkMode ? 'text-[#b5b5b5]' : 'text-text-main/60',
                    )}
                  >
                    联系方式
                  </span>
                  <input
                    value={form.contact}
                    onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
                    placeholder="邮箱或 GitHub（可选）"
                    className={cn(
                      'h-12 w-full rounded-xl px-4.5 text-sm outline-none transition-colors focus:border-primary/60',
                      darkMode
                        ? 'border border-[#303030] bg-[#202020] text-[#e0e0e0] placeholder:text-[#6b6b6b] focus:border-cyan-300/55'
                        : 'border border-border-subtle bg-white/78 placeholder:text-text-main/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]',
                    )}
                  />
                </label>
              </div>

              <div>
                <span
                  className={cn(
                    'mb-2 block text-xs font-bold uppercase tracking-[0.22em]',
                    darkMode ? 'text-[#b5b5b5]' : 'text-text-main/60',
                  )}
                >
                  反馈内容
                </span>
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDraggingAttachment(true);
                  }}
                  onDragLeave={() => setDraggingAttachment(false)}
                  onDrop={handleAttachmentDrop}
                  className={cn(
                    'relative overflow-hidden rounded-2xl border transition-colors focus-within:border-primary/60',
                    darkMode
                      ? 'border-[#303030] bg-[#202020] focus-within:border-cyan-300/55'
                      : 'border-border-subtle bg-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]',
                    draggingAttachment && (darkMode ? 'border-cyan-300/60' : 'border-primary/60'),
                  )}
                >
                  <textarea
                    value={form.content}
                    onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                    required
                    rows={5}
                    placeholder=" "
                    className={cn(
                      'w-full resize-none bg-transparent px-4.5 py-4.5 text-sm leading-7 outline-none placeholder-transparent',
                      darkMode ? 'text-[#e0e0e0]' : '',
                    )}
                  />

                  {showUploadPrompt ? (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-8">
                      <div className="flex flex-col items-center gap-4 text-center">
                        <p
                          className={cn(
                            'max-w-[420px] text-sm leading-7',
                            darkMode ? 'text-[#e0e0e0]/72' : 'text-text-main/50',
                          )}
                        >
                          描述现象、预期结果、复现步骤或你希望看到的改进
                        </p>
                        <label
                          className={cn(
                            'pointer-events-auto flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-sm transition-colors',
                            darkMode
                              ? draggingAttachment
                                ? 'bg-cyan-400/8'
                                : 'hover:bg-[#252525]'
                              : draggingAttachment
                                ? 'bg-primary/8'
                                : 'hover:bg-bg-base/70',
                          )}
                        >
                          <input
                            type="file"
                            multiple
                            className="sr-only"
                            onChange={(event) => {
                              addAttachments(event.target.files);
                              event.target.value = '';
                            }}
                          />
                          <span className="flex min-w-0 items-center gap-2">
                            <FileUp size={16} className={darkMode ? 'text-cyan-300' : 'text-primary'} />
                            <span className={cn('truncate', darkMode ? 'text-[#d8d8d8]' : 'text-text-main/68')}>
                              可点击或拖入图片、日志、截图等文件
                            </span>
                          </span>
                          <span
                            className={cn(
                              'hidden shrink-0 text-xs sm:inline',
                              darkMode ? 'text-[#858585]' : 'text-text-main/45',
                            )}
                          >
                            可多选
                          </span>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-4">
                      <label
                        className={cn(
                          'flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-sm transition-colors',
                          darkMode
                            ? draggingAttachment
                              ? 'bg-cyan-400/8'
                              : 'hover:bg-[#252525]'
                            : draggingAttachment
                              ? 'bg-primary/8'
                              : 'hover:bg-bg-base/70',
                        )}
                      >
                        <input
                          type="file"
                          multiple
                          className="sr-only"
                          onChange={(event) => {
                            addAttachments(event.target.files);
                            event.target.value = '';
                          }}
                        />
                        <span className="flex min-w-0 items-center gap-2">
                          <FileUp size={16} className={darkMode ? 'text-cyan-300' : 'text-primary'} />
                          <span className={cn('truncate', darkMode ? 'text-[#d8d8d8]' : 'text-text-main/68')}>
                            可点击或拖入图片、日志、截图等文件
                          </span>
                        </span>
                        <span
                          className={cn(
                            'hidden shrink-0 text-xs sm:inline',
                            darkMode ? 'text-[#858585]' : 'text-text-main/45',
                          )}
                        >
                          可多选
                        </span>
                      </label>

                      {attachments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {attachments.map((file) => (
                            <div
                              key={`${file.name}-${file.size}-${file.lastModified}`}
                              className={cn(
                                'flex max-w-full items-center gap-2 rounded-lg px-3 py-2 text-sm',
                                darkMode ? 'bg-[#252525]' : 'bg-bg-base/70',
                              )}
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <Paperclip size={14} className={darkMode ? 'text-cyan-300' : 'text-primary'} />
                                <span className="max-w-[220px] truncate">{file.name}</span>
                                <span
                                  className={cn(
                                    'shrink-0 font-mono text-[10px]',
                                    darkMode ? 'text-[#858585]' : 'text-text-main/42',
                                  )}
                                >
                                  {formatFileSize(file.size)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeAttachment(file)}
                                className={cn(
                                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                                  darkMode
                                    ? 'text-[#858585] hover:bg-[#2d2d2d] hover:text-[#e0e0e0]'
                                    : 'text-text-main/40 hover:bg-white hover:text-text-main',
                                )}
                                aria-label={`移除 ${file.name}`}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold uppercase tracking-[0.24em] transition-opacity',
                  darkMode ? 'bg-[#094771] text-white hover:bg-[#0a5280]' : 'bg-text-main text-white hover:opacity-90',
                )}
              >
                提交反馈
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
