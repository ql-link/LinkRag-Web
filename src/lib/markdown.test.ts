import { describe, expect, it } from 'vitest';
import { extractMarkdownToc, parseMarkdownContent } from './markdown';

describe('markdown helpers', () => {
  it('parses frontmatter without leaking it into rendered content', () => {
    const parsed = parseMarkdownContent(`---
title: Demo
tags:
  - markdown
---

# Heading
Body`);

    expect(parsed.frontmatter).toEqual({ title: 'Demo', tags: ['markdown'] });
    expect(parsed.content).toBe('# Heading\nBody');
  });

  it('normalizes CJK-adjacent emphasis outside code spans and fences', () => {
    const parsed = parseMarkdownContent(`中文**重点**内容
\`中文**代码**内容\`

\`\`\`md
中文**代码块**内容
\`\`\``);

    expect(parsed.content).toContain('中文<strong>重点</strong>内容');
    expect(parsed.content).toContain('`中文**代码**内容`');
    expect(parsed.content).toContain('中文**代码块**内容');
  });

  it('separates CJK paragraphs from following list markers', () => {
    const parsed = parseMarkdownContent(`说明：
- 第一项
- 第二项`);

    expect(parsed.content).toBe('说明：\n\n- 第一项\n- 第二项');
  });

  it('extracts stable toc ids and ignores headings inside fenced code', () => {
    const toc = extractMarkdownToc(`
## Intro
### Repeat
### Repeat

\`\`\`md
## Hidden
\`\`\`

## [Linked \`Title\`](https://example.com) ##
`);

    expect(toc).toEqual([
      { id: 'intro', text: 'Intro', level: 2 },
      { id: 'repeat', text: 'Repeat', level: 3 },
      { id: 'repeat-1', text: 'Repeat', level: 3 },
      { id: 'linked-title', text: 'Linked Title', level: 2 },
    ]);
  });
});
