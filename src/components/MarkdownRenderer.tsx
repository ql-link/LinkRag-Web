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
import { createMarkdownSlugger, parseMarkdownContent } from '@/lib/markdown';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  showFrontmatter?: boolean;
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

const isExternalHref = (href?: string) => Boolean(href && /^(https?:)?\/\//.test(href));

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
      .render(renderId, chart)
      .then(({ svg }) => {
        if (isMounted) setSvgContent(svg);
      })
      .catch((reason) => {
        console.error('Mermaid rendering failed', reason);
        if (isMounted) setError('Mermaid 图表渲染失败');
      });

    return () => {
      isMounted = false;
    };
  }, [chart, darkMode, renderId]);

  if (error) {
    return (
      <pre className="my-6 overflow-x-auto rounded-lg border border-state-error/30 bg-state-error/10 p-4 text-sm text-state-error">
        <code>{error}</code>
      </pre>
    );
  }

  return (
    <div
      className="not-prose my-8 overflow-x-auto rounded-lg border border-border-subtle bg-white/50 p-4 dark:bg-[#1e1e1e]"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
};

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
type HeadingRendererProps = ComponentPropsWithoutRef<'h1'> & {
  level: HeadingLevel;
  getHeadingId: (text: string) => string;
  node?: unknown;
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
  const id = getHeadingId(text);
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
};

const codeLanguagePattern = /language-([\w-]+)/;

const getCodeLanguage = (className?: string) => codeLanguagePattern.exec(className || '')?.[1] ?? '';

const CodeRenderer = ({ className, children, node: _node, ...props }: CodeRendererProps) => {
  return (
    <code
      className={cn(
        'rounded bg-black/5 px-1.5 py-0.5 font-mono text-[0.9em] text-[#b42318] dark:bg-white/10 dark:text-[#ff7b72]',
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
};

const getCodeElement = (children: React.ReactNode): React.ReactElement<CodeRendererProps> | null => {
  const [firstChild] = React.Children.toArray(children);
  return React.isValidElement<CodeRendererProps>(firstChild) ? firstChild : null;
};

const PreRenderer = ({ children, node: _node, ...props }: PreRendererProps) => {
  const [copied, setCopied] = useState(false);
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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="not-prose group relative my-8 overflow-hidden rounded-2xl border border-border-subtle bg-white/50 backdrop-blur-sm transition-colors dark:bg-[#2d2d2d]">
      <div className="flex items-center justify-between border-b border-border-subtle bg-bg-base/30 px-4 py-3 dark:bg-[#252526]">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileCode2 size={15} strokeWidth={1.8} />
          </span>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-text-main/50">
            {language || 'text'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-text-main/50 opacity-100 transition-colors hover:bg-primary/5 hover:text-primary sm:opacity-0 sm:group-hover:opacity-100"
          title="复制代码"
        >
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <SyntaxHighlighter
        style={(darkMode ? vscDarkPlus : oneLight) as Record<string, React.CSSProperties>}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '1.125rem 1rem',
          background: 'transparent',
          fontSize: '0.875rem',
          lineHeight: '1.65',
        }}
        codeTagProps={{
          style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

const BlockquoteRenderer = ({
  node: _node,
  className,
  ...props
}: ComponentPropsWithoutRef<'blockquote'> & { node?: unknown }) => {
  return (
    <blockquote
      className={cn(
        'not-prose my-8 rounded-r-lg border-l-2 border-primary bg-black/5 px-5 py-3 text-text-main dark:bg-white/5',
        '[&_p]:my-0 [&_p]:leading-8 [&_p]:text-text-main',
        className,
      )}
      {...props}
    />
  );
};

function FrontmatterBlock({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  return (
    <div className="not-prose mb-10 mt-2 rounded-lg border border-border-subtle bg-white/35 p-4 dark:bg-white/5">
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

export function MarkdownRenderer({ content, className, showFrontmatter = true }: MarkdownRendererProps) {
  const { darkMode } = useTheme();
  const parsed = useMemo(() => parseMarkdownContent(content), [content]);
  const getHeadingId = createMarkdownSlugger();

  const components: Components = {
    code: CodeRenderer as Components['code'],
    pre: PreRenderer as Components['pre'],
    blockquote: BlockquoteRenderer as Components['blockquote'],
    h1: (props) => <HeadingRenderer level={1} getHeadingId={getHeadingId} {...props} />,
    h2: (props) => <HeadingRenderer level={2} getHeadingId={getHeadingId} {...props} />,
    h3: (props) => <HeadingRenderer level={3} getHeadingId={getHeadingId} {...props} />,
    h4: (props) => <HeadingRenderer level={4} getHeadingId={getHeadingId} {...props} />,
    h5: (props) => <HeadingRenderer level={5} getHeadingId={getHeadingId} {...props} />,
    h6: (props) => <HeadingRenderer level={6} getHeadingId={getHeadingId} {...props} />,
    table: ({ node: _node, className: tableClassName, ...props }) => (
      <div className="not-prose my-8 overflow-x-auto rounded-lg border border-border-subtle">
        <table className={cn('w-full border-collapse text-sm', tableClassName)} {...props} />
      </div>
    ),
    th: ({ node: _node, className: thClassName, ...props }) => (
      <th
        className={cn(
          'border-b border-border-subtle bg-black/5 px-3 py-2 text-left font-semibold text-text-main dark:bg-white/5',
          thClassName,
        )}
        {...props}
      />
    ),
    td: ({ node: _node, className: tdClassName, ...props }) => (
      <td
        className={cn('border-b border-border-subtle px-3 py-2 align-top text-text-main last:border-b-0', tdClassName)}
        {...props}
      />
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
      <img className={cn('mx-auto rounded-lg shadow-sm', imageClassName)} alt={alt ?? ''} loading="lazy" {...props} />
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
        'prose-strong:text-text-main prose-code:before:content-none prose-code:after:content-none',
        'prose-blockquote:rounded-r-lg prose-blockquote:border-l-primary prose-blockquote:bg-black/5 prose-blockquote:px-5 prose-blockquote:py-2 prose-blockquote:text-text-main prose-blockquote:not-italic dark:prose-blockquote:bg-white/5',
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
