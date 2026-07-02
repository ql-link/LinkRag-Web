import React, { useEffect, useId, useMemo, useState, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import {
  Check,
  CircleX,
  Copy,
  Lightbulb,
  PencilLine,
  Pin,
  Search,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { extractMarkdownHeadings, parseMarkdownContent, slugifyMarkdownHeading } from '@/lib/markdown';
import { MediaLightbox, ZoomableImage } from '@/components/MediaPreview';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  showFrontmatter?: boolean;
  compact?: boolean;
}

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ['className', /^language-./, 'math-inline', 'math-display']],
    input: [...(defaultSchema.attributes?.input ?? []), ['checked', true]],
  },
};

const extractText = (children: React.ReactNode): string => {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(children)) return extractText(children.props.children);
  return '';
};

const getPlainTextChildren = (children: React.ReactNode): string | null => {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    const parts = children.map(getPlainTextChildren);
    return parts.every((part): part is string => part !== null) ? parts.join('') : null;
  }
  return null;
};

const INLINE_MARKDOWN_PATTERN = /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|~~[^~\n]+?~~|`[^`\n]+?`|\[[^\]\n]+?\]\([^)]+?\))/;
const STATUS_SYMBOL_PATTERN = /(✅|☑️|☑|✔️|✔|❌|✖️|✖|⚠️|⚠|💡|📌|🔍|📝|🚀)/gu;

const isExternalHref = (href?: string) => Boolean(href && /^(https?:)?\/\//.test(href));

type InlineStatusSymbolConfig = {
  label: string;
  icon: LucideIcon;
  className: string;
};

const getInlineStatusSymbolConfig = (symbol: string): InlineStatusSymbolConfig | null => {
  const normalized = symbol.replace(/\uFE0F/g, '');

  if (normalized === '✅' || normalized === '☑' || normalized === '✔') {
    return {
      label: '完成',
      icon: Check,
      className: 'border-[#2f7d62]/20 bg-[#2f7d62]/10 text-[#2f7d62]',
    };
  }

  if (normalized === '❌' || normalized === '✖') {
    return {
      label: '错误',
      icon: CircleX,
      className: 'border-state-error/20 bg-state-error/10 text-state-error',
    };
  }

  if (normalized === '⚠') {
    return {
      label: '注意',
      icon: TriangleAlert,
      className: 'border-[#b7791f]/20 bg-[#b7791f]/10 text-[#9a640f]',
    };
  }

  if (normalized === '💡') {
    return {
      label: '提示',
      icon: Lightbulb,
      className: 'border-primary/20 bg-primary/10 text-primary',
    };
  }

  if (normalized === '📌') {
    return {
      label: '重点',
      icon: Pin,
      className: 'border-[#8a6f4d]/20 bg-[#8a6f4d]/10 text-[#755f42]',
    };
  }

  if (normalized === '🔍') {
    return {
      label: '检索',
      icon: Search,
      className: 'border-[#5f7284]/20 bg-[#5f7284]/10 text-[#526579]',
    };
  }

  if (normalized === '📝') {
    return {
      label: '记录',
      icon: PencilLine,
      className: 'border-[#6f6a8f]/20 bg-[#6f6a8f]/10 text-[#5f5a7f]',
    };
  }

  if (normalized === '🚀') {
    return {
      label: '推进',
      icon: Sparkles,
      className: 'border-[#cc785c]/20 bg-[#cc785c]/10 text-[#ad6048]',
    };
  }

  return null;
};

const InlineStatusSymbol = ({ symbol }: { symbol: string }) => {
  const config = getInlineStatusSymbolConfig(symbol);
  if (!config) return <>{symbol}</>;

  const Icon = config.icon;
  return (
    <span
      aria-label={config.label}
      title={config.label}
      className={cn(
        'not-prose mx-0.5 inline-flex size-[1.15em] translate-y-[0.14em] items-center justify-center rounded-[5px] border align-baseline',
        config.className,
      )}
    >
      <Icon size="0.78em" strokeWidth={2.2} />
    </span>
  );
};

const renderStatusSymbolsInText = (text: string, keyPrefix: string): React.ReactNode[] => {
  STATUS_SYMBOL_PATTERN.lastIndex = 0;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = STATUS_SYMBOL_PATTERN.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    nodes.push(<InlineStatusSymbol key={`${keyPrefix}-${match.index}-${match[0]}`} symbol={match[0]} />);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
};

const renderStatusSymbols = (children: React.ReactNode, keyPrefix = 'status-symbol'): React.ReactNode => {
  if (typeof children === 'string') return renderStatusSymbolsInText(children, keyPrefix);
  if (typeof children === 'number') return children;
  if (Array.isArray(children)) {
    return children.flatMap((child, index) => renderStatusSymbols(child, `${keyPrefix}-${index}`));
  }
  return children;
};

type CodeBlockFrameProps = {
  code: string;
  language: string;
  notice?: string;
  compact?: boolean;
};

const CodeBlockFrame = ({ code, language, notice, compact = false }: CodeBlockFrameProps) => {
  const [copied, setCopied] = useState(false);
  const { darkMode } = useTheme();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        'not-prose group relative overflow-hidden rounded-md border border-hairline bg-surface-soft/45 transition-colors',
        compact ? 'my-2' : 'my-6',
      )}
    >
      <div className={cn('flex items-center justify-between gap-3', compact ? 'px-3 pt-2' : 'px-4 pt-3')}>
        <span className="font-mono text-[11px] font-medium text-muted-soft">{language || 'text'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'inline-flex items-center gap-1 rounded text-[11px] font-medium text-muted transition-colors hover:text-primary sm:opacity-0 sm:group-hover:opacity-100',
            compact ? 'py-0.5' : 'py-1',
          )}
          title="复制代码"
        >
          {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      {notice && (
        <div className="border-b border-border-subtle bg-state-error/10 px-4 py-2 text-xs font-medium text-state-error">
          {notice}
        </div>
      )}
      <SyntaxHighlighter
        style={(darkMode ? vscDarkPlus : oneLight) as Record<string, React.CSSProperties>}
        language={language || 'text'}
        PreTag="div"
        wrapLongLines={false}
        customStyle={{
          margin: 0,
          padding: compact ? '0.5rem 0.75rem 0.75rem' : '0.625rem 1rem 1rem',
          background: 'transparent',
          fontSize: compact ? '0.75rem' : '0.8125rem',
          lineHeight: compact ? '1.55' : '1.65',
          overflowX: 'auto',
        }}
        codeTagProps={{
          style: {
            fontFamily: 'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

const MermaidChart = ({ chart, darkMode }: { chart: string; darkMode: boolean }) => {
  const [svgContent, setSvgContent] = useState('');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const reactId = useId();
  const renderId = useMemo(() => `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [reactId]);

  useEffect(() => {
    let isMounted = true;
    setSvgContent('');
    setError('');

    mermaid.initialize({
      startOnLoad: false,
      theme: darkMode ? 'dark' : 'default',
      securityLevel: 'strict',
    });

    mermaid
      .parse(chart, { suppressErrors: true })
      .then((parseResult) => {
        if (!parseResult) throw new Error('Invalid Mermaid syntax');
        return mermaid.render(renderId, chart);
      })
      .then(({ svg }) => {
        if (isMounted) setSvgContent(svg);
      })
      .catch((reason) => {
        console.error('Mermaid rendering failed', reason);
        if (isMounted) setError('Mermaid 语法错误，已按代码块显示');
      });

    return () => {
      isMounted = false;
    };
  }, [chart, darkMode, renderId]);

  if (error) {
    return <CodeBlockFrame code={chart} language="mermaid" notice={error} />;
  }

  const handleOpenKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!svgContent || !isOpenMediaKey(event)) return;
    event.preventDefault();
    setOpen(true);
  };

  return (
    <>
      <div
        className={cn(
          'not-prose my-8 overflow-x-auto rounded-lg border border-border-subtle bg-surface-card p-4 transition-colors dark:bg-[#1f1f1f]',
          '[&_svg]:h-auto [&_svg]:max-w-none',
          svgContent && 'cursor-zoom-in hover:border-primary/35',
        )}
        role={svgContent ? 'button' : undefined}
        tabIndex={svgContent ? 0 : undefined}
        aria-label={svgContent ? '查看 Mermaid 图详情' : undefined}
        title={svgContent ? '查看 Mermaid 图详情' : undefined}
        onClick={() => {
          if (svgContent) setOpen(true);
        }}
        onKeyDown={handleOpenKeyDown}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      <MediaLightbox open={open} title="Mermaid 图详情" onClose={() => setOpen(false)}>
        <div
          className="flex h-[86vh] w-[92vw] select-none items-center justify-center rounded-md bg-white p-5 text-slate-950 shadow-2xl dark:bg-[#1f1f1f] dark:text-white [&_svg]:h-auto [&_svg]:max-h-[78vh] [&_svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </MediaLightbox>
    </>
  );
};

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
type MarkdownNodeWithPosition = {
  position?: {
    start?: {
      line?: number;
    };
  };
};

type HeadingRendererProps = ComponentPropsWithoutRef<'h1'> & {
  level: HeadingLevel;
  getHeadingId: (text: string, node?: MarkdownNodeWithPosition) => string;
  node?: MarkdownNodeWithPosition;
};

const headingSizeClasses: Record<HeadingLevel, string> = {
  1: 'text-3xl md:text-4xl',
  2: 'text-2xl md:text-3xl border-b border-border-subtle pb-2',
  3: 'text-xl md:text-2xl',
  4: 'text-lg md:text-xl',
  5: 'text-base md:text-lg',
  6: 'text-sm md:text-base uppercase text-text-main/60',
};

const HeadingRenderer = ({ level, getHeadingId, children, className, node: _node, ...props }: HeadingRendererProps) => {
  const text = extractText(children);
  const id = getHeadingId(text, _node);
  const Tag = `h${level}` as React.ElementType<ComponentPropsWithoutRef<'h1'>>;

  return (
    <Tag
      id={id}
      className={cn('group relative scroll-mt-24 font-bold tracking-normal', headingSizeClasses[level], className)}
      {...props}
    >
      <a
        href={`#${id}`}
        className="not-prose absolute -left-10 top-1/2 hidden -translate-y-1/2 font-mono text-xs font-semibold text-primary/50 no-underline opacity-0 transition-opacity hover:text-primary group-hover:opacity-100 sm:block"
        aria-label={`${text} permalink`}
      >
        H{level}
      </a>
      {children}
    </Tag>
  );
};

type CodeRendererProps = ComponentPropsWithoutRef<'code'> & {
  inline?: boolean;
  node?: unknown;
  compact?: boolean;
};

const codeLanguagePattern = /language-([\w-]+)/;

const getCodeLanguage = (className?: string) => codeLanguagePattern.exec(className || '')?.[1] ?? '';

const CodeRenderer = ({ className, children, node: _node, compact: _compact, ...props }: CodeRendererProps) => {
  return (
    <code
      className={cn(
        'rounded-md border border-primary/18 bg-primary/8 px-1.5 py-[0.12rem] font-mono text-[0.86em] font-semibold text-primary',
        className,
      )}
      {...props}
    >
      {children}
    </code>
  );
};

type PreRendererProps = ComponentPropsWithoutRef<'pre'> & {
  node?: unknown;
  compact?: boolean;
};

const getCodeElement = (children: React.ReactNode): React.ReactElement<CodeRendererProps> | null => {
  const [firstChild] = React.Children.toArray(children);
  return React.isValidElement<CodeRendererProps>(firstChild) ? firstChild : null;
};

const isOpenMediaKey = (event: React.KeyboardEvent<HTMLElement>) => event.key === 'Enter' || event.key === ' ';

const PreRenderer = ({ children, node: _node, compact = false, ...props }: PreRendererProps) => {
  const { darkMode } = useTheme();
  const codeElement = getCodeElement(children);

  if (!codeElement) {
    return <pre {...props}>{children}</pre>;
  }

  const code = codeElement ? extractText(codeElement.props.children).replace(/\n$/, '') : extractText(children);
  const language = getCodeLanguage(codeElement?.props.className);

  if (language === 'mermaid') {
    return <MermaidChart chart={code} darkMode={darkMode} />;
  }

  return <CodeBlockFrame code={code} language={language || 'text'} compact={compact} />;
};

const BlockquoteRenderer = ({
  node: _node,
  className,
  ...props
}: ComponentPropsWithoutRef<'blockquote'> & { node?: unknown }) => {
  return (
    <blockquote
      className={cn(
        'not-prose my-6 border-l-2 border-primary/45 bg-transparent py-1 pl-4 pr-0 text-text-main',
        '[&_p]:my-0 [&_p]:leading-8 [&_p]:text-text-main/85',
        className,
      )}
      {...props}
    />
  );
};

function InlineMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      components={{
        p: ({ node: _node, children }) => <>{renderStatusSymbols(children)}</>,
        code: CodeRenderer as Components['code'],
        a: ({ node: _node, href, className: linkClassName, ...props }) => (
          <a
            href={href}
            target={isExternalHref(href) ? '_blank' : undefined}
            rel={isExternalHref(href) ? 'noopener noreferrer' : undefined}
            className={cn('underline-offset-4', linkClassName)}
            {...props}
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function TableCellContent({ children }: { children: React.ReactNode }) {
  const plainText = getPlainTextChildren(children);
  if (plainText && INLINE_MARKDOWN_PATTERN.test(plainText)) {
    return <InlineMarkdown content={plainText} />;
  }
  return <>{renderStatusSymbols(children)}</>;
}

function FrontmatterBlock({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  return (
    <div className="not-prose mb-10 mt-2 rounded-lg border border-border-subtle bg-surface-card p-4 dark:bg-surface-card">
      <dl className="grid gap-3 sm:grid-cols-[140px_1fr]">
        {entries.map(([key, value]) => (
          <React.Fragment key={key}>
            <dt className="font-mono text-xs uppercase tracking-widest text-text-main/50">{key}</dt>
            <dd className="break-words text-sm text-text-main">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
}

export function MarkdownRenderer({
  content,
  className,
  showFrontmatter = true,
  compact = false,
}: MarkdownRendererProps) {
  const { darkMode } = useTheme();
  const parsed = useMemo(() => parseMarkdownContent(content), [content]);
  const headingIdByLine = useMemo(() => {
    return new Map(extractMarkdownHeadings(parsed.content).map((heading) => [heading.line, heading.id]));
  }, [parsed.content]);
  const getHeadingId = (text: string, node?: MarkdownNodeWithPosition) => {
    const line = node?.position?.start?.line;
    if (line) return headingIdByLine.get(line) ?? slugifyMarkdownHeading(text);
    return slugifyMarkdownHeading(text);
  };

  const components: Components = {
    code: (props) => <CodeRenderer compact={compact} {...props} />,
    pre: (props) => <PreRenderer compact={compact} {...props} />,
    blockquote: BlockquoteRenderer as Components['blockquote'],
    p: ({ node: _node, children, ...props }) => <p {...props}>{renderStatusSymbols(children)}</p>,
    li: ({ node: _node, children, ...props }) => <li {...props}>{renderStatusSymbols(children)}</li>,
    h1: (props) => <HeadingRenderer level={1} getHeadingId={getHeadingId} {...props} />,
    h2: (props) => <HeadingRenderer level={2} getHeadingId={getHeadingId} {...props} />,
    h3: (props) => <HeadingRenderer level={3} getHeadingId={getHeadingId} {...props} />,
    h4: (props) => <HeadingRenderer level={4} getHeadingId={getHeadingId} {...props} />,
    h5: (props) => <HeadingRenderer level={5} getHeadingId={getHeadingId} {...props} />,
    h6: (props) => <HeadingRenderer level={6} getHeadingId={getHeadingId} {...props} />,
    table: ({ node: _node, className: tableClassName, ...props }) => (
      <div className={cn('not-prose overflow-x-auto border border-border-subtle', compact ? 'my-2' : 'my-8')}>
        <table className={cn('w-full border-collapse', compact ? 'text-xs' : 'text-sm', tableClassName)} {...props} />
      </div>
    ),
    th: ({ node: _node, className: thClassName, children, ...props }) => (
      <th
        className={cn(
          'border-b border-border-subtle bg-black/5 px-3 py-2 text-left font-semibold text-text-main dark:bg-surface-card',
          thClassName,
        )}
        {...props}
      >
        <TableCellContent>{children}</TableCellContent>
      </th>
    ),
    td: ({ node: _node, className: tdClassName, children, ...props }) => (
      <td
        className={cn('border-b border-border-subtle px-3 py-2 align-top text-text-main last:border-b-0', tdClassName)}
        {...props}
      >
        <TableCellContent>{children}</TableCellContent>
      </td>
    ),
    a: ({ node: _node, href, className: linkClassName, ...props }) => {
      const recallChunkMatch = /^#recall-chunk-(\d+)$/.exec(href ?? '');

      if (recallChunkMatch) {
        const chunkNumber = recallChunkMatch[1];

        return (
          <a
            href={href}
            aria-label={`查看片段 ${chunkNumber}`}
            title={`查看片段 ${chunkNumber}`}
            className={cn(
              'not-prose mx-0.5 inline-flex size-[1.55em] translate-y-[-0.1em] items-center justify-center rounded-full bg-surface-soft align-baseline text-[0.72em] font-semibold leading-none text-text-secondary no-underline transition-colors hover:bg-muted-soft/20 hover:text-ink hover:no-underline',
              linkClassName,
            )}
            {...props}
          >
            <span className="tabular-nums">{chunkNumber}</span>
          </a>
        );
      }

      return (
        <a
          href={href}
          target={isExternalHref(href) ? '_blank' : undefined}
          rel={isExternalHref(href) ? 'noopener noreferrer' : undefined}
          className={cn('underline-offset-4', linkClassName)}
          {...props}
        />
      );
    },
    img: ({ node: _node, className: imageClassName, alt, ...props }) => (
      <ZoomableImage className={imageClassName} alt={alt ?? ''} {...props} />
    ),
    input: ({ node: _node, className: inputClassName, ...props }) => (
      <input className={cn('mr-2 translate-y-[1px] accent-primary', inputClassName)} readOnly {...props} />
    ),
  };

  return (
    <div
      className={cn(
        'markdown-body w-full max-w-none break-words',
        'prose prose-slate dark:prose-invert',
        'prose-headings:font-bold prose-headings:tracking-normal prose-headings:text-text-main',
        'prose-p:leading-8 prose-p:text-text-main',
        'prose-li:text-text-main prose-ol:text-text-main prose-ul:text-text-main',
        'prose-em:text-text-main prose-td:text-text-main prose-th:text-text-main',
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        'prose-strong:font-extrabold prose-strong:text-text-main prose-code:before:content-none prose-code:after:content-none',
        'prose-blockquote:border-l-primary/45 prose-blockquote:bg-transparent prose-blockquote:py-1 prose-blockquote:pl-4 prose-blockquote:pr-0 prose-blockquote:text-text-main prose-blockquote:not-italic',
        'prose-hr:border-border-subtle prose-img:my-8',
        darkMode &&
          'prose-headings:text-[#f2f2f2] prose-p:text-[#d6d6d6] prose-li:text-[#d6d6d6] prose-strong:text-[#f2f2f2]',
        className,
      )}
    >
      {showFrontmatter && <FrontmatterBlock data={parsed.frontmatter} />}
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema], rehypeKatex]}
        components={components}
      >
        {parsed.content}
      </ReactMarkdown>
    </div>
  );
}
