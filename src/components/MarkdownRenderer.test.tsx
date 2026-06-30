import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarkdownRenderer } from './MarkdownRenderer';

const mermaidMock = vi.hoisted(() => ({
  initialize: vi.fn(),
  parse: vi.fn(async (): Promise<{ diagramType: string } | false> => ({ diagramType: 'flowchart-v2' })),
  render: vi.fn(async () => ({
    svg: '<svg data-testid="mermaid-svg" role="img"></svg>',
  })),
}));

vi.mock('mermaid', () => ({
  default: mermaidMock,
}));

vi.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: { children: ReactNode }) => (
    <div data-testid="syntax-highlighter">
      <code>{children}</code>
    </div>
  ),
}));

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneLight: {},
  vscDarkPlus: {},
}));

describe('MarkdownRenderer', () => {
  beforeEach(() => {
    mermaidMock.initialize.mockClear();
    mermaidMock.render.mockClear();
    mermaidMock.parse.mockReset();
    mermaidMock.parse.mockResolvedValue({ diagramType: 'flowchart-v2' });
  });

  it('renders fenced code blocks in a custom block outside markdown pre wrappers', () => {
    render(<MarkdownRenderer content={'```ts\nconst value = 1;\n```'} />);

    const languageLabel = screen.getByText('ts');
    const codeBlock = languageLabel.closest('.not-prose');

    expect(codeBlock).toBeInstanceOf(HTMLDivElement);
    expect(codeBlock?.closest('pre')).toBeNull();
    expect(screen.getByTestId('syntax-highlighter')).toHaveTextContent('const value = 1;');
  });

  it('renders unlabeled fenced code blocks as block code', () => {
    render(<MarkdownRenderer content={'```\nplain text\n```'} />);

    const languageLabel = screen.getByText('text');
    const codeBlock = languageLabel.closest('.not-prose');

    expect(codeBlock).toBeInstanceOf(HTMLDivElement);
    expect(codeBlock?.closest('pre')).toBeNull();
    expect(screen.getByTestId('syntax-highlighter')).toHaveTextContent('plain text');
  });

  it('renders mermaid code fences as diagrams outside markdown pre wrappers', async () => {
    render(<MarkdownRenderer content={'```mermaid\ngraph TD\n  A --> B\n```'} />);

    const svg = await waitFor(() => screen.getByTestId('mermaid-svg'));
    const diagramBlock = svg.closest('.not-prose');

    expect(diagramBlock).toBeInstanceOf(HTMLDivElement);
    expect(diagramBlock?.closest('pre')).toBeNull();
    expect(diagramBlock).toHaveClass('overflow-x-auto');
    expect(diagramBlock).toHaveClass('[&_svg]:max-w-none');
  });

  it('falls back to a code block when mermaid syntax is invalid', async () => {
    mermaidMock.parse.mockResolvedValueOnce(false);

    render(<MarkdownRenderer content={'```mermaid\nconst value = 1;\n```'} />);

    expect(await screen.findByText('Mermaid 语法错误，已按代码块显示')).toBeInTheDocument();
    expect(screen.getByTestId('syntax-highlighter')).toHaveTextContent('const value = 1;');
    expect(screen.queryByTestId('mermaid-svg')).not.toBeInTheDocument();
  });

  it('renders blockquotes with the explicit quote block style', () => {
    render(<MarkdownRenderer content={'> quoted text'} />);

    const quote = screen.getByText('quoted text').closest('blockquote');

    expect(quote).toHaveClass('not-prose');
    expect(quote).toHaveClass('border-primary/45');
    expect(quote).toHaveClass('bg-transparent');
  });

  it('renders deterministic heading ids that match markdown toc links', () => {
    const { container } = render(
      <MarkdownRenderer
        content={'## 高速 Vibe Coding 先带来的不是效率问题，而是约束问题\n\n## 长期契约：docs/ 分层与机器同步'}
      />,
    );

    expect(container.querySelector('h2')?.id).toBe('高速-vibe-coding-先带来的不是效率问题而是约束问题');
  });

  it('renders bold text in markdown table cells', () => {
    render(<MarkdownRenderer content={'| Name |\n| --- |\n| **Bold value** |'} />);

    expect(screen.getByText('Bold value').tagName).toBe('STRONG');
  });

  it('renders inline markdown inside raw html table cells', () => {
    render(<MarkdownRenderer content={'<table><tbody><tr><td>**Bold value**</td></tr></tbody></table>'} />);

    expect(screen.getByText('Bold value').tagName).toBe('STRONG');
    expect(screen.queryByText('**Bold value**')).not.toBeInTheDocument();
  });

  it('renders inline latex math with KaTeX', () => {
    const { container } = render(<MarkdownRenderer content={'质能方程 $E = mc^2$'} />);

    expect(container.querySelector('.katex')).toBeInTheDocument();
    expect(screen.queryByText('$E = mc^2$')).not.toBeInTheDocument();
  });

  it('renders common status emoji as inline interface symbols', () => {
    render(<MarkdownRenderer content={'✅ 已完成\n\n- ⚠️ 需要注意'} />);

    expect(screen.getByLabelText('完成')).toBeInTheDocument();
    expect(screen.getByLabelText('注意')).toBeInTheDocument();
    expect(screen.queryByText('✅')).not.toBeInTheDocument();
    expect(screen.queryByText('⚠️')).not.toBeInTheDocument();
  });

  it('normalizes bracket latex delimiters before rendering math', () => {
    const { container } = render(<MarkdownRenderer content={'\\[\na^2 + b^2 = c^2\n\\]'} />);

    expect(container.querySelector('.katex-display')).toBeInTheDocument();
    expect(screen.queryByText(/\\\[/)).not.toBeInTheDocument();
  });

  it('renders multiple bold spans in the same CJK table row without leaking markers', () => {
    render(
      <MarkdownRenderer
        content={
          '| 车道 | 走什么链 | 说明 |\n| --- | --- | --- |\n| **L1 快车道** | 实现 → 测试 → PR | 单文件 / 配置 / 文案 / 小修，**无契约变更**; 不需要 `state.yaml`、brief、acceptance |'
        }
      />,
    );

    expect(screen.getByText('L1 快车道').tagName).toBe('STRONG');
    expect(screen.getByText('无契约变更').tagName).toBe('STRONG');
    expect(screen.queryByText(/\*\*L1/)).not.toBeInTheDocument();
    expect(screen.queryByText(/变更\*\*/)).not.toBeInTheDocument();
  });

  it('renders recall chunk links as circular citation numbers', () => {
    render(<MarkdownRenderer content={'参考 [片段 2](#recall-chunk-2)'} />);

    const link = screen.getByRole('link', { name: '查看片段 2' });
    expect(link).toHaveAttribute('href', '#recall-chunk-2');
    expect(link).toHaveTextContent('2');
    expect(link).not.toHaveTextContent('片段');
  });
});
