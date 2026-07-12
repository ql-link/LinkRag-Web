import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import { Code, Heading2, Image, List, ListOrdered, Minus, Quote, SquareCheck, Table } from 'lucide-react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

type Block = { type: 'line' | 'code' | 'table'; start: number; end: number };

type InlineToken =
  | { type: 'text'; raw: string; start: number; end: number }
  | {
      type: 'strong' | 'em' | 'delete' | 'code';
      id: string;
      raw: string;
      markerOpen: string;
      markerClose: string;
      text: string;
      start: number;
      end: number;
    }
  | { type: 'link'; id: string; raw: string; text: string; url: string; start: number; end: number }
  | { type: 'image'; id: string; raw: string; alt: string; src: string; start: number; end: number };

const parseInlineTokens = (text: string): InlineToken[] => {
  const tokens: InlineToken[] = [];
  const pattern =
    /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|`([^`\n]+)`|\*\*([^*\n]+)\*\*|~~([^~\n]+)~~|(^|[^*\w])\*([^*\n]+)\*(?!\*)/g;
  let cursor = 0;
  let count = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    const raw = match[0];
    if (start > cursor) tokens.push({ type: 'text', raw: text.slice(cursor, start), start: cursor, end: start });
    const id = `token-${start}-${count++}`;
    if (match[1] !== undefined && match[2] !== undefined) {
      tokens.push({ type: 'image', id, raw, alt: match[1], src: match[2], start, end: start + raw.length });
    } else if (match[3] !== undefined && match[4] !== undefined) {
      tokens.push({ type: 'link', id, raw, text: match[3], url: match[4], start, end: start + raw.length });
    } else if (match[5] !== undefined) {
      tokens.push({
        type: 'code',
        id,
        raw,
        markerOpen: '`',
        markerClose: '`',
        text: match[5],
        start,
        end: start + raw.length,
      });
    } else if (match[6] !== undefined) {
      tokens.push({
        type: 'strong',
        id,
        raw,
        markerOpen: '**',
        markerClose: '**',
        text: match[6],
        start,
        end: start + raw.length,
      });
    } else if (match[7] !== undefined) {
      tokens.push({
        type: 'delete',
        id,
        raw,
        markerOpen: '~~',
        markerClose: '~~',
        text: match[7],
        start,
        end: start + raw.length,
      });
    } else if (match[9] !== undefined) {
      const leading = match[8] ?? '';
      if (leading) tokens.push({ type: 'text', raw: leading, start, end: start + leading.length });
      tokens.push({
        type: 'em',
        id,
        raw: raw.slice(leading.length),
        markerOpen: '*',
        markerClose: '*',
        text: match[9],
        start: start + leading.length,
        end: start + raw.length,
      });
    }
    cursor = start + raw.length;
  }
  if (cursor < text.length) tokens.push({ type: 'text', raw: text.slice(cursor), start: cursor, end: text.length });
  return tokens;
};

function InlineTokenView({ token, active, editing }: { token: InlineToken; active: boolean; editing: boolean }) {
  if (token.type === 'text') return <>{token.raw}</>;
  const className = active ? 'live-md-token live-md-token-active' : 'live-md-token';
  if (token.type === 'link') {
    return (
      <span className={className}>
        <span className="live-md-marker live-md-marker-open">[</span>
        <span className="font-medium text-primary no-underline underline-offset-4">{token.text}</span>
        <span className="live-md-marker live-md-marker-close">]({token.url})</span>
      </span>
    );
  }
  if (token.type === 'image') {
    if (!editing && !token.src.startsWith('uploading://')) {
      return <img src={token.src} alt={token.alt || '正文图片'} className="my-4 block max-w-full rounded-md" />;
    }
    return (
      <span className={className}>
        <span className="live-md-marker live-md-marker-open">![</span>
        <span className="live-md-image-alt">{token.alt || '图片'}</span>
        <span className="live-md-marker live-md-marker-close">]({token.src})</span>
      </span>
    );
  }
  const content =
    token.type === 'strong' ? (
      <strong className="font-extrabold text-text-main">{token.text}</strong>
    ) : token.type === 'em' ? (
      <em>{token.text}</em>
    ) : token.type === 'delete' ? (
      <del>{token.text}</del>
    ) : (
      <code className="rounded-md border border-primary/18 bg-primary/8 px-1.5 py-[0.12rem] font-mono text-[0.86em] font-semibold text-primary">
        {token.text}
      </code>
    );
  return (
    <span className={className}>
      <span className="live-md-marker live-md-marker-open">{token.markerOpen}</span>
      {content}
      <span className="live-md-marker live-md-marker-close">{token.markerClose}</span>
    </span>
  );
}

const classify = (line: string) => {
  if (/^#{1,6}\s+/.test(line)) return 'heading';
  if (/^>\s?/.test(line)) return 'quote';
  if (/^\s*[-*+]\s+(\[[ xX]\]\s+)?/.test(line) || /^\s*\d+\.\s+/.test(line)) return 'list';
  return 'paragraph';
};

const groupBlocks = (lines: string[]): Block[] => {
  const blocks: Block[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (/^\s*```/.test(lines[index])) {
      const start = index;
      while (index + 1 < lines.length && !/^\s*```/.test(lines[index + 1])) index += 1;
      if (index + 1 < lines.length) index += 1;
      blocks.push({ type: 'code', start, end: index });
    } else if (/^\s*\|.*\|\s*$/.test(lines[index])) {
      const start = index;
      while (index + 1 < lines.length && /^\s*\|.*\|\s*$/.test(lines[index + 1])) index += 1;
      blocks.push({ type: index > start ? 'table' : 'line', start, end: index });
    } else {
      blocks.push({ type: 'line', start: index, end: index });
    }
  }
  return blocks;
};

const prefixParts = (line: string) => {
  const match = line.match(/^(#{1,6}\s+|>\s?|\s*[-*+]\s+(?:\[[ xX]\]\s+)?|\s*\d+\.\s+)/);
  const prefix = match?.[0] ?? '';
  return { prefix, text: line.slice(prefix.length) };
};

const visiblePrefix = (prefix: string) => {
  if (/^\s*[-*+]\s+\[[xX]\]\s+$/.test(prefix)) return '☑';
  if (/^\s*[-*+]\s+\[ \]\s+$/.test(prefix)) return '☐';
  if (/^\s*[-*+]\s+$/.test(prefix)) return '•';
  const ordered = prefix.match(/(\d+)\.\s+$/);
  return ordered ? `${ordered[1]}.` : '';
};

const clipboardImageFiles = (clipboard: DataTransfer) =>
  Array.from(clipboard.items)
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file));

const imageAltText = (file: File, index: number) => {
  const basename = file.name.replace(/\.[^.]+$/, '').trim();
  return basename && basename !== 'image' ? basename : `正文图片 ${index + 1}`;
};

const caretOffset = (element: HTMLElement) => {
  const selection = window.getSelection();
  const fallback = (element.textContent ?? '').length;
  if (!selection?.rangeCount || !element.contains(selection.anchorNode)) return fallback;
  try {
    const range = selection.getRangeAt(0).cloneRange();
    range.selectNodeContents(element);
    range.setEnd(selection.anchorNode!, selection.anchorOffset);
    return range.toString().length;
  } catch {
    return fallback;
  }
};

const placeCaret = (element: HTMLElement, offset: number | null) => {
  const range = document.createRange();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let remaining = offset ?? (element.textContent ?? '').length;
  let node = walker.nextNode();
  while (node) {
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) {
      range.setStart(node, remaining);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      return;
    }
    remaining -= length;
    node = walker.nextNode();
  }
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
};

function ToolbarButton({ title, icon, onClick }: { title: string; icon: ReactElement; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-card hover:text-primary"
    >
      {icon}
    </button>
  );
}

function EditableLine({
  line,
  editing,
  focusNonce,
  caret,
  onActivate,
  onInput,
  onKeyDown,
  onBlur,
}: {
  line: string;
  editing: boolean;
  focusNonce: number;
  caret: number | null;
  onActivate: () => void;
  onInput: (text: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onBlur: (text: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { prefix, text } = prefixParts(line);
  // Keep the editable DOM uncontrolled for the lifetime of an edit session.
  // Re-rendering contentEditable children after every input makes React replace
  // its text node, which destroys the browser selection and moves the caret.
  const [editableText] = useState(text);
  const [tokens] = useState(() => parseInlineTokens(text));
  const [activeTokenId, setActiveTokenId] = useState<string | null>(null);
  const updateActiveToken = () => {
    if (!editing) {
      setActiveTokenId(null);
      return;
    }
    if (!ref.current) return;
    const offset = caretOffset(ref.current);
    const token = tokens.find((item) => item.type !== 'text' && offset > item.start && offset < item.end);
    setActiveTokenId(token?.type === 'text' ? null : (token?.id ?? null));
  };
  useEffect(() => {
    if (!editing || !focusNonce || !ref.current) return;
    ref.current.focus();
    placeCaret(ref.current, caret);
  }, [editing, focusNonce, caret]);
  const kind = classify(line);
  const headingLevel = line.match(/^(#{1,6})\s+/)?.[1].length ?? 0;
  const headingClass =
    headingLevel === 1
      ? 'text-3xl font-bold leading-tight md:text-4xl'
      : headingLevel === 2
        ? 'border-b border-border-subtle pb-2 text-2xl font-bold leading-tight md:text-3xl'
        : headingLevel === 3
          ? 'text-xl font-bold leading-snug md:text-2xl'
          : headingLevel === 4
            ? 'text-lg font-bold leading-snug md:text-xl'
            : headingLevel === 5
              ? 'text-base font-bold leading-normal md:text-lg'
              : 'text-sm font-bold uppercase leading-normal text-text-main/60 md:text-base';
  const displayPrefix = visiblePrefix(prefix);
  const applyInlineShortcut = (element: HTMLDivElement, markerOpen: string, markerClose = markerOpen) => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !element.contains(selection.anchorNode) || !element.contains(selection.focusNode))
      return;
    const selectedText = selection.toString();
    const fallback = markerOpen === '[' ? '链接文字' : markerOpen === '`' ? '代码' : '文本';
    document.execCommand('insertText', false, `${markerOpen}${selectedText || fallback}${markerClose}`);
  };
  return (
    <div
      onClick={() => {
        if (!editing) onActivate();
      }}
      className={`live-markdown-preview flex cursor-text items-baseline gap-2 ${kind === 'quote' ? 'border-l-2 border-l-primary/45 py-1 pl-4' : ''}`}
    >
      {displayPrefix && (
        <span className="w-5 shrink-0 select-none text-right text-base leading-8 text-text-main">{displayPrefix}</span>
      )}
      <div
        ref={ref}
        contentEditable={editing}
        suppressContentEditableWarning
        spellCheck={false}
        onInput={(event: FormEvent<HTMLDivElement>) => {
          if (editing) onInput(prefix + (event.currentTarget.textContent ?? ''));
        }}
        onFocus={() => window.requestAnimationFrame(updateActiveToken)}
        onMouseUp={updateActiveToken}
        onKeyUp={updateActiveToken}
        onKeyDown={(event) => {
          if (!editing) return;
          const modifier = event.metaKey || event.ctrlKey;
          if (modifier) {
            const key = event.key.toLowerCase();
            if (key === 'b') {
              event.preventDefault();
              applyInlineShortcut(event.currentTarget, '**');
              return;
            }
            if (key === 'i') {
              event.preventDefault();
              applyInlineShortcut(event.currentTarget, '*');
              return;
            }
            if (key === 'k') {
              event.preventDefault();
              applyInlineShortcut(event.currentTarget, '[', '](https://)');
              return;
            }
            if (key === 'e') {
              event.preventDefault();
              applyInlineShortcut(event.currentTarget, '`');
              return;
            }
            if (key === 'x' && event.shiftKey) {
              event.preventDefault();
              applyInlineShortcut(event.currentTarget, '~~');
              return;
            }
          }
          onKeyDown(event);
        }}
        onBlur={(event) => {
          if (editing) onBlur(prefix + (event.currentTarget.textContent ?? ''));
        }}
        className={`min-h-8 min-w-0 flex-1 whitespace-pre-wrap break-words text-text-main outline-none ${kind === 'heading' ? headingClass : kind === 'quote' ? 'text-base leading-8 text-text-main/85' : 'text-base leading-8'}`}
      >
        {tokens.length > 0
          ? tokens.map((token, index) => (
              <InlineTokenView
                key={`${token.start}-${token.end}-${index}`}
                token={token}
                active={editing && token.type !== 'text' && token.id === activeTokenId}
                editing={editing}
              />
            ))
          : editableText}
      </div>
    </div>
  );
}

export function LiveMarkdownEditor({
  value,
  onChange,
  docKey,
  onSave,
  uploadImage,
}: {
  value: string;
  onChange: (value: string) => void;
  docKey: string;
  onSave?: () => void;
  uploadImage?: (file: File) => Promise<string>;
}) {
  const [lines, setLines] = useState(() => (value || '').split('\n'));
  const [focusLine, setFocusLine] = useState<number | null>(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [caretHint, setCaretHint] = useState<number | null>(null);
  const [uploadingImageCount, setUploadingImageCount] = useState(0);
  const lastFocusRef = useRef<number | null>(null);
  const internalValueRef = useRef(value);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const historyDocKeyRef = useRef(docKey);
  const pasteBatchRef = useRef(0);
  const contentRootRef = useRef<HTMLDivElement>(null);
  const lastSelectAllRef = useRef<{ line: number; timeStamp: number } | null>(null);

  useEffect(() => {
    if (historyDocKeyRef.current !== docKey) {
      historyDocKeyRef.current = docKey;
      undoStackRef.current = [];
      redoStackRef.current = [];
    }
    if (value === internalValueRef.current) return;
    internalValueRef.current = value;
    setLines((value || '').split('\n'));
    setFocusLine(null);
  }, [docKey, value]);

  const update = (next: string[], nextFocus?: number, caret: number | null = null) => {
    const markdown = next.join('\n');
    if (markdown !== internalValueRef.current) {
      undoStackRef.current.push(internalValueRef.current);
      redoStackRef.current = [];
    }
    setLines(next);
    internalValueRef.current = markdown;
    onChange(markdown);
    if (nextFocus !== undefined) {
      setCaretHint(caret);
      lastFocusRef.current = nextFocus;
      setFocusLine(nextFocus);
      setFocusNonce((nonce) => nonce + 1);
    }
  };

  const restoreHistoryValue = (markdown: string) => {
    const next = markdown.split('\n');
    const targetLine = Math.min(lastFocusRef.current ?? 0, Math.max(0, next.length - 1));
    setLines(next);
    internalValueRef.current = markdown;
    onChange(markdown);
    lastFocusRef.current = targetLine;
    setFocusLine(targetLine);
    setCaretHint(next[targetLine]?.length ?? 0);
    setFocusNonce((nonce) => nonce + 1);
  };

  const undo = () => {
    const previous = undoStackRef.current.pop();
    if (previous === undefined) return;
    redoStackRef.current.push(internalValueRef.current);
    restoreHistoryValue(previous);
  };

  const redo = () => {
    const next = redoStackRef.current.pop();
    if (next === undefined) return;
    undoStackRef.current.push(internalValueRef.current);
    restoreHistoryValue(next);
  };

  const handlePasteImages = async (event: ClipboardEvent<HTMLDivElement>) => {
    const images = clipboardImageFiles(event.clipboardData);
    if (images.length === 0 || !uploadImage) return;
    event.preventDefault();
    event.stopPropagation();

    const insertAfter = focusLine ?? lastFocusRef.current ?? Math.max(0, lines.length - 1);
    pasteBatchRef.current += 1;
    const batchId = pasteBatchRef.current;
    const placeholders = images.map(
      (file, index) => `![${imageAltText(file, index)}](uploading://clipboard-image-${batchId}-${index})`,
    );
    const next = [...lines];
    next.splice(insertAfter + 1, 0, ...placeholders);
    update(next);
    setUploadingImageCount((count) => count + images.length);

    for (const [index, file] of images.entries()) {
      try {
        const url = await uploadImage(file);
        const current = internalValueRef.current;
        const replacement = `![${imageAltText(file, index)}](${url})`;
        update(current.replace(placeholders[index], replacement).split('\n'));
      } catch (error) {
        const message = error instanceof Error ? error.message : '图片上传失败';
        const current = internalValueRef.current;
        update(current.replace(placeholders[index], `<!-- ${message} -->`).split('\n'));
        window.alert(message);
      } finally {
        setUploadingImageCount((count) => Math.max(0, count - 1));
      }
    }
  };

  const blocks = useMemo(() => groupBlocks(lines), [lines]);
  const focus = (line: number, caret: number | null = null) => update(lines, line, caret);
  const mutateFocused = (mutation: (line: string) => string) => {
    const index = lastFocusRef.current ?? Math.max(0, lines.length - 1);
    const next = [...lines];
    next[index] = mutation(next[index] ?? '');
    update(next, index, next[index].length);
  };
  const insertBlock = (content: string[]) => {
    const index = lastFocusRef.current == null ? lines.length : lastFocusRef.current + 1;
    const next = [...lines];
    next.splice(index, 0, ...content);
    update(next, index, content[0]?.length ?? 0);
  };

  return (
    <div
      className="live-markdown-editor"
      onPasteCapture={handlePasteImages}
      onKeyDownCapture={(event) => {
        const modifier = event.metaKey || event.ctrlKey;
        if (!modifier) return;
        const key = event.key.toLowerCase();
        if (
          key === 'a' &&
          !event.repeat &&
          focusLine !== null &&
          contentRootRef.current?.contains(document.activeElement)
        ) {
          const previous = lastSelectAllRef.current;
          const isSecondPress =
            previous !== null && previous.line === focusLine && event.timeStamp - previous.timeStamp <= 1200;
          if (isSecondPress) {
            event.preventDefault();
            event.stopPropagation();
            const range = document.createRange();
            range.selectNodeContents(contentRootRef.current);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            lastSelectAllRef.current = null;
          } else {
            lastSelectAllRef.current = { line: focusLine, timeStamp: event.timeStamp };
          }
          return;
        }
        if (key === 'z') {
          event.preventDefault();
          event.stopPropagation();
          if (event.shiftKey) redo();
          else undo();
        } else if (key === 'y') {
          event.preventDefault();
          event.stopPropagation();
          redo();
        } else if (key === 's') {
          event.preventDefault();
          event.stopPropagation();
          onSave?.();
        }
      }}
    >
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-border-subtle bg-bg-base/90 py-2 backdrop-blur">
        <ToolbarButton
          title="标题"
          icon={<Heading2 size={16} />}
          onClick={() => mutateFocused((text) => `## ${text.replace(/^#{1,6}\s+/, '') || '标题'}`)}
        />
        <ToolbarButton
          title="引用"
          icon={<Quote size={16} />}
          onClick={() => mutateFocused((text) => `> ${text.replace(/^>\s?/, '')}`)}
        />
        <ToolbarButton
          title="无序列表"
          icon={<List size={16} />}
          onClick={() => mutateFocused((text) => `- ${text.replace(/^\s*[-*+]\s+/, '')}`)}
        />
        <ToolbarButton
          title="有序列表"
          icon={<ListOrdered size={16} />}
          onClick={() => mutateFocused((text) => `1. ${text.replace(/^\s*\d+\.\s+/, '')}`)}
        />
        <ToolbarButton
          title="待办"
          icon={<SquareCheck size={16} />}
          onClick={() => mutateFocused((text) => `- [ ] ${text.replace(/^\s*[-*+]\s+(\[[ xX]\]\s+)?/, '')}`)}
        />
        <span className="mx-1 h-4 w-px bg-border-subtle" />
        <ToolbarButton title="代码块" icon={<Code size={16} />} onClick={() => insertBlock(['```js', '', '```'])} />
        <ToolbarButton
          title="表格"
          icon={<Table size={16} />}
          onClick={() => insertBlock(['| 列 A | 列 B |', '| --- | --- |', '| 内容 | 内容 |'])}
        />
        <ToolbarButton title="图片" icon={<Image size={16} />} onClick={() => insertBlock(['![图片说明](图片地址)'])} />
        <ToolbarButton title="分割线" icon={<Minus size={16} />} onClick={() => insertBlock(['---'])} />
        <span className="ml-auto pr-1 text-[11px] text-muted-soft">
          {uploadingImageCount > 0
            ? `正在上传 ${uploadingImageCount} 张图片…`
            : '连续两次 ⌘/Ctrl+A 全选正文 · 支持粘贴图片 · ⌘/Ctrl+S 保存'}
        </span>
      </div>
      <div ref={contentRootRef} className="pb-20 pt-3">
        {blocks.map((block) => {
          const focused = focusLine !== null && focusLine >= block.start && focusLine <= block.end;
          const markdown = lines.slice(block.start, block.end + 1).join('\n');
          if (block.type !== 'line') {
            if (!focused) {
              return (
                <div
                  key={`${block.type}-${block.start}`}
                  onClickCapture={(event) => {
                    event.preventDefault();
                    focus(block.start);
                  }}
                  className="live-markdown-preview cursor-text"
                >
                  <MarkdownRenderer content={markdown || '\u00a0'} showFrontmatter={false} />
                </div>
              );
            }
            return (
              <textarea
                key={block.start}
                autoFocus
                value={markdown}
                spellCheck={false}
                onChange={(event) => {
                  const next = [...lines];
                  next.splice(block.start, block.end - block.start + 1, ...event.target.value.split('\n'));
                  update(next);
                }}
                onBlur={() => setFocusLine(null)}
                className="my-4 min-h-32 w-full resize-y rounded-md border border-border-subtle bg-surface-soft p-4 font-mono text-sm leading-7 text-text-main outline-none focus:border-primary/40"
              />
            );
          }
          return (
            <EditableLine
              key={`${block.start}-${focused ? `editing-${focusNonce}` : `rendered-${markdown}`}`}
              line={lines[block.start] ?? ''}
              editing={focused}
              focusNonce={focused ? focusNonce : 0}
              caret={caretHint}
              onActivate={() => focus(block.start)}
              onInput={(text) => {
                const next = [...lines];
                next[block.start] = text;
                update(next);
              }}
              onBlur={(text) => {
                const next = [...lines];
                next[block.start] = text;
                update(next);
                setFocusLine(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  const offset = caretOffset(event.currentTarget);
                  const text = event.currentTarget.textContent ?? '';
                  const prefix = prefixParts(lines[block.start]).prefix;
                  const next = [...lines];
                  next[block.start] = prefix + text.slice(0, offset);
                  next.splice(block.start + 1, 0, text.slice(offset));
                  update(next, block.start + 1, 0);
                }
                if (event.key === 'Backspace' && caretOffset(event.currentTarget) === 0 && block.start > 0) {
                  event.preventDefault();
                  const next = [...lines];
                  const previousLength = next[block.start - 1].length;
                  next[block.start - 1] += event.currentTarget.textContent ?? '';
                  next.splice(block.start, 1);
                  update(next, block.start - 1, previousLength);
                }
              }}
            />
          );
        })}
        <div
          onClick={() => {
            const next = [...lines, ''];
            update(next, next.length - 1, 0);
          }}
          className="h-12 cursor-text"
        />
      </div>
    </div>
  );
}
