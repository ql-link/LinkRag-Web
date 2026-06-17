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
