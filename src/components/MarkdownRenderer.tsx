import React, { useEffect, useId, useMemo, useState, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy, FileCode2 } from 'lucide-react';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { extractMarkdownHeadings, parseMarkdownContent, slugifyMarkdownHeading } from '@/lib/markdown';

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

const isExternalHref = (href?: string) => Boolean(href && /^(https?:)?\/\//.test(href));

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
        'not-prose group relative overflow-hidden border border-border-subtle transition-colors',
        compact ? 'bg-surface-soft/80 dark:bg-surface-card' : 'bg-surface-card dark:bg-[#2d2d2d]',
        compact ? 'my-2 rounded-lg' : 'my-8 rounded-2xl',
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between border-b border-border-subtle',
          compact ? 'bg-canvas/70 dark:bg-white/[0.03]' : 'bg-bg-base/30 dark:bg-[#252526]',
          compact ? 'px-2.5 py-1.5' : 'px-4 py-3',
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'flex items-center justify-center bg-primary/10 text-primary',
              compact ? 'size-5 rounded-md' : 'size-7 rounded-xl',
            )}
          >
            <FileCode2 size={compact ? 12 : 15} strokeWidth={1.8} />
          </span>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-text-main/50">
            {language || 'text'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-text-main/50 opacity-100 transition-colors hover:bg-primary/5 hover:text-primary sm:opacity-0 sm:group-hover:opacity-100',
            compact ? 'rounded-md px-2 py-1' : 'rounded-xl px-2.5 py-1.5',
          )}
          title="复制代码"
        >
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      {notice && (
        <div className="border-b border-border-subtle bg-state-error/10 px-4 py-2 text-xs font-medium text-state-error">
          {notice}
        </div>
      )}
      <SyntaxHighlighter
        style={(compact ? oneLight : darkMode ? vscDarkPlus : oneLight) as Record<string, React.CSSProperties>}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: compact ? '0.625rem 0.75rem' : '1.125rem 1rem',
          background: 'transparent',
          fontSize: compact ? '0.75rem' : '0.875rem',
          lineHeight: compact ? '1.55' : '1.65',
        }}
        codeTagProps={{
          style: {
            color: compact ? 'var(--color-text-main, #24292f)' : undefined,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
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

  return (
    <div
      className="not-prose my-8 overflow-x-auto rounded-lg border border-border-subtle bg-surface-card p-4 dark:bg-[#1e1e1e] [&_svg]:h-auto [&_svg]:max-w-none"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
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
        'rounded bg-black/5 px-1.5 py-0.5 font-mono text-[0.9em] text-[#b42318] dark:bg-surface-card dark:text-[#ff7b72]',
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
        'not-prose my-8 rounded-r-lg border-l-2 border-primary bg-black/5 px-5 py-3 text-text-main dark:bg-surface-card',
        '[&_p]:my-0 [&_p]:leading-8 [&_p]:text-text-main',
        className,
      )}
      {...props}
    />
  );
};

function InlineMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ node: _node, children }) => <>{children}</>,
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
  return <>{children}</>;
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
    h1: (props) => <HeadingRenderer level={1} getHeadingId={getHeadingId} {...props} />,
    h2: (props) => <HeadingRenderer level={2} getHeadingId={getHeadingId} {...props} />,
    h3: (props) => <HeadingRenderer level={3} getHeadingId={getHeadingId} {...props} />,
    h4: (props) => <HeadingRenderer level={4} getHeadingId={getHeadingId} {...props} />,
    h5: (props) => <HeadingRenderer level={5} getHeadingId={getHeadingId} {...props} />,
    h6: (props) => <HeadingRenderer level={6} getHeadingId={getHeadingId} {...props} />,
    table: ({ node: _node, className: tableClassName, ...props }) => (
      <div
        className={cn('not-prose overflow-x-auto rounded-lg border border-border-subtle', compact ? 'my-2' : 'my-8')}
      >
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
    a: ({ node: _node, href, className: linkClassName, ...props }) => (
      <a
        href={href}
        target={isExternalHref(href) ? '_blank' : undefined}
        rel={isExternalHref(href) ? 'noopener noreferrer' : undefined}
        className={cn('underline-offset-4', linkClassName)}
        {...props}
      />
    ),
    img: ({ node: _node, className: imageClassName, alt, ...props }) => (
      <img className={cn('mx-auto rounded-lg ', imageClassName)} alt={alt ?? ''} loading="lazy" {...props} />
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
        'prose-blockquote:rounded-r-lg prose-blockquote:border-l-primary prose-blockquote:bg-black/5 prose-blockquote:px-5 prose-blockquote:py-2 prose-blockquote:text-text-main prose-blockquote:not-italic dark:prose-blockquote:bg-surface-card',
        'prose-hr:border-border-subtle prose-img:my-8',
        darkMode &&
          'prose-headings:text-[#f2f2f2] prose-p:text-[#cccccc] prose-li:text-[#cccccc] prose-strong:text-[#f2f2f2]',
        className,
      )}
    >
      {showFrontmatter && <FrontmatterBlock data={parsed.frontmatter} />}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
        components={components}
      >
        {parsed.content}
      </ReactMarkdown>
    </div>
  );
}
