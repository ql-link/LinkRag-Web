import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownRenderer } from './MarkdownRenderer';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(async () => ({
      svg: '<svg data-testid="mermaid-svg" role="img"></svg>',
    })),
  },
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
  });

  it('renders blockquotes with the explicit quote block style', () => {
    render(<MarkdownRenderer content={'> quoted text'} />);

    const quote = screen.getByText('quoted text').closest('blockquote');

    expect(quote).toHaveClass('not-prose');
    expect(quote).toHaveClass('border-primary');
  });
});
