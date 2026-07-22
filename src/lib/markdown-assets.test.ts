import { describe, expect, it } from 'vitest';
import {
  collectMarkdownAssetFiles,
  collectShallowMarkdownAssetFiles,
  extractLocalMarkdownImageReferences,
  isMarkdownKnowledgeFile,
  normalizeAssetRelativePath,
} from './markdown-assets';

function fileNamed(name: string, type = '') {
  return new File(['demo'], name, { type });
}

function folderFile(name: string, webkitRelativePath: string, type = 'image/png') {
  const file = fileNamed(name, type);
  Object.defineProperty(file, 'webkitRelativePath', {
    configurable: true,
    value: webkitRelativePath,
  });
  return file;
}

describe('markdown assets', () => {
  it('detects Markdown files by suffix', () => {
    expect(isMarkdownKnowledgeFile(fileNamed('doc.md'))).toBe(true);
    expect(isMarkdownKnowledgeFile(fileNamed('doc.MARKDOWN'))).toBe(true);
    expect(isMarkdownKnowledgeFile(fileNamed('doc.pdf'))).toBe(false);
  });

  it('extracts standard, reference, HTML and Obsidian local image references', () => {
    const markdown = [
      '![a](images/a.png)',
      '![b](<images/b.png>)',
      '<img src="images/c.png">',
      "<img alt='d' src='images/d.webp'>",
      '![ref][diagram]',
      '[diagram]: images/e.png "title"',
      '![[images/f.png\\|示意图]]',
      '![remote](https://example.com/a.png)',
      '![data](data:image/png;base64,xxx)',
      '![anchor](#diagram)',
    ].join('\n');

    expect(extractLocalMarkdownImageReferences(markdown)).toEqual([
      'images/a.png',
      'images/b.png',
      'images/e.png',
      'images/c.png',
      'images/d.webp',
      'images/f.png',
    ]);
  });

  it('rejects local absolute image paths before upload', () => {
    expect(() => extractLocalMarkdownImageReferences('![file](file:///Users/demo/a.png)')).toThrow(/绝对图片路径/);
  });

  it('ignores image-like text inside fenced and inline code', () => {
    const markdown = [
      '`![inline](images/inline.png)`',
      '```markdown',
      '![fenced](images/fenced.png)',
      '<img src="images/fenced-html.png">',
      '```',
      '![real](images/real.png)',
    ].join('\n');

    expect(extractLocalMarkdownImageReferences(markdown)).toEqual(['images/real.png']);
  });

  it('normalizes asset relative paths and rejects unsafe paths', () => {
    expect(normalizeAssetRelativePath('images\\a.png')).toBe('images/a.png');
    expect(normalizeAssetRelativePath('/images/a.png')).toBe('images/a.png');
    expect(normalizeAssetRelativePath('../images/a.png')).toBeNull();
    expect(normalizeAssetRelativePath('images/../a.png')).toBeNull();
  });

  it('collects image files relative to the selected folder', () => {
    const assets = collectMarkdownAssetFiles([
      folderFile('a.png', 'assets/images/a.png'),
      folderFile('b.webp', 'assets/icons/b.webp', ''),
      folderFile('notes.txt', 'assets/notes.txt', 'text/plain'),
      folderFile('unsafe.png', 'assets/../unsafe.png'),
    ]);

    expect(assets.map((asset) => asset.relativePath)).toEqual(['images/a.png', 'icons/b.webp']);
  });

  it('single-file supplementary folder only keeps direct children', () => {
    const selection = collectShallowMarkdownAssetFiles([
      folderFile('a.png', 'assets/a.png'),
      folderFile('b.png', 'assets/nested/b.png'),
    ]);

    expect(selection.assets.map((asset) => asset.relativePath)).toEqual(['a.png']);
    expect(selection.inventoryPaths).toEqual(['a.png']);
    expect(selection.ignoredNestedAssetCount).toBe(1);
  });
});
