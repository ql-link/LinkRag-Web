import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import YAML from 'yaml';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────

const extractText = (children: React.ReactNode): string => {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (children?.props?.children) return extractText(children.props.children);
  return '';
};

const slugify = (text: string) => {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]+/g, '');
};

// ── Mermaid Component ───────────────────────────────────────────────────

const MermaidChart = ({ chart, darkMode }: { chart: string; darkMode: boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: darkMode ? 'dark' : 'default',
    });
    
    let isMounted = true;
    const renderChart = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        if (isMounted) setSvgContent(svg);
      } catch (e) {
        console.error('Mermaid rendering failed', e);
      }
    };
    renderChart();
    
    return () => { isMounted = false; };
  }, [chart, darkMode]);

  return (
    <div 
      ref={ref} 
      className="flex justify-center my-8 overflow-x-auto p-4 bg-white/5 dark:bg-black/20 rounded-xl" 
      dangerouslySetInnerHTML={{ __html: svgContent }} 
    />
  );
};

// ── Heading Component ───────────────────────────────────────────────────

const HeadingRenderer = ({ level, children, ...props }: React.ReactNode) => {
  const text = extractText(children);
  const id = slugify(text);
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  const sizeClasses = {
    1: 'text-4xl md:text-5xl font-extrabold mt-12 mb-6 tracking-tight',
    2: 'text-3xl md:text-4xl font-bold mt-10 mb-5 tracking-tight border-b pb-2 border-black/5 dark:border-white/5',
    3: 'text-2xl md:text-3xl font-bold mt-8 mb-4 tracking-tight',
    4: 'text-xl md:text-2xl font-bold mt-6 mb-3 tracking-tight',
    5: 'text-lg md:text-xl font-bold mt-5 mb-2',
    6: 'text-base md:text-lg font-bold mt-4 mb-2 uppercase tracking-wider text-black/50 dark:text-white/50',
  }[level as 1|2|3|4|5|6] || '';

  return (
    <Tag id={id} className={cn("group relative scroll-mt-24", sizeClasses, props.className)} {...props}>
      <a 
        href={`#${id}`} 
        className={cn(
          "absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 no-underline text-primary/50 hover:text-primary hidden sm:block font-normal",
          level === 1 ? "text-3xl" : level === 2 ? "text-2xl" : "text-xl"
        )}
        aria-label="Permalink"
      >
        #
      </a>
      {children}
    </Tag>
  );
};

// ── Code Component ──────────────────────────────────────────────────────

const CodeBlock = ({ inline, className, children, ...props }: React.ReactNode) => {
  const [copied, setCopied] = useState(false);
  const { darkMode } = useTheme();
  
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';

  if (language === 'mermaid' && !inline) {
    return <MermaidChart chart={String(children)} darkMode={darkMode} />;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="relative group my-6 rounded-xl overflow-hidden bg-[#1E1E1E] border border-white/10 shadow-lg">
        {/* Code Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#2D2D2D]/80 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
              <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
            </div>
            <span className="ml-2 text-xs font-mono font-semibold text-gray-400 uppercase tracking-wider">
              {language}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
            title="复制代码"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            {copied ? '已复制' : '复制'}
          </button>
        </div>
        
        <SyntaxHighlighter
          style={vscDarkPlus as any}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: '1.25rem 1rem',
            background: 'transparent',
            fontSize: '0.875rem',
            lineHeight: '1.6',
          }}
          codeTagProps={{
            style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }
          }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    );
  }

  // Inline code
  return (
    <code className={cn("bg-black/5 dark:bg-white/10 text-[#eb5757] dark:text-[#ff7b72] rounded-md px-1.5 py-0.5 text-[0.9em] font-mono", className)} {...props}>
      {children}
    </code>
  );
};

// ── Main Renderer Component ───────────────────────────────────────────────

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const { darkMode } = useTheme();

  // Extract Frontmatter
  let cleanContent = content;
  let frontmatter: Record<string, any> | null = null;
  const match = /^---\n([\s\S]*?)\n---/.exec(content);
  if (match) {
    try {
      frontmatter = YAML.parse(match[1]);
      cleanContent = content.slice(match[0].length).trim();
    } catch (e) {
      console.warn('Failed to parse frontmatter', e);
    }
  }

  return (
    <div className={cn(
      'w-full break-words prose max-w-none',
      darkMode 
        ? 'prose-invert prose-headings:text-[#e0e0e0] prose-p:text-[#cccccc] prose-a:text-[#3b82f6] prose-strong:text-[#e0e0e0] prose-blockquote:border-l-[#3b82f6] prose-blockquote:bg-[#1e1e1e] prose-th:bg-[#1e1e1e] prose-td:border-[#333]' 
        : 'prose-slate prose-headings:text-[#1a1a1a] prose-p:text-[#4a4a4a] prose-a:text-primary prose-strong:text-[#1a1a1a] prose-blockquote:border-l-primary prose-blockquote:bg-gray-50 prose-th:bg-gray-50 prose-td:border-gray-200',
      // Custom generic styles
      'prose-p:leading-loose prose-p:my-5',
      'prose-li:my-2 prose-ul:my-5 prose-ol:my-5',
      'prose-blockquote:not-italic prose-blockquote:px-5 prose-blockquote:py-2 prose-blockquote:rounded-r-xl prose-blockquote:my-8',
      'prose-headings:font-bold prose-headings:tracking-tight prose-headings:mt-10 prose-headings:mb-5 prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg',
      'prose-img:rounded-2xl prose-img:shadow-md prose-img:my-10',
      'prose-a:no-underline hover:prose-a:underline hover:prose-a:underline-offset-4',
      'prose-table:overflow-hidden prose-table:rounded-xl prose-table:border prose-table:my-8 prose-th:p-3 prose-td:p-3',
      className
    )}>
      {frontmatter && Object.keys(frontmatter).length > 0 && (
        <div className="mb-10 mt-2">
          <div className="flex flex-col gap-2">
            {Object.entries(frontmatter).map(([key, value]) => (
              <div key={key} className="flex items-baseline gap-4">
                <span className="text-[13px] font-medium opacity-50 min-w-[120px] shrink-0">{key}</span>
                <span className="text-[13px] font-medium opacity-90 break-all">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
          <hr className="my-8 border-black/10 dark:border-white/10" />
        </div>
      )}

      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, {
            ...defaultSchema,
            attributes: {
              ...defaultSchema.attributes,
              '*': ['className', 'style'],
              'div': ['className', 'style']
            }
          }]
        ]}
        components={{
          code: CodeBlock as any,
          h1: (props) => <HeadingRenderer level={1} {...props} />,
          h2: (props) => <HeadingRenderer level={2} {...props} />,
          h3: (props) => <HeadingRenderer level={3} {...props} />,
          h4: (props) => <HeadingRenderer level={4} {...props} />,
          h5: (props) => <HeadingRenderer level={5} {...props} />,
          h6: (props) => <HeadingRenderer level={6} {...props} />,
          // Custom wrapper for tables to allow horizontal scrolling on small screens
          table: ({ _node, ...props }) => (
            <div className="overflow-x-auto my-8 rounded-xl border border-black/10 dark:border-white/10 shadow-sm">
              <table className="w-full text-sm m-0 border-collapse" {...props} />
            </div>
          ),
          th: ({ _node, ...props }) => (
            <th className="font-bold p-3 text-left border-b border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5" {...props} />
          ),
          td: ({ _node, ...props }) => (
            <td className="p-3 border-b border-black/5 dark:border-white/5 last:border-b-0" {...props} />
          ),
          a: ({ _node, ...props }) => (
            <a target="_blank" rel="noopener noreferrer" {...props} />
          )
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
}
