import { describe, expect, it } from 'vitest';
import {
  collectMarkdownAssetFiles,
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

  it('extracts local Markdown and HTML image references', () => {
    const markdown = [
      '![a](images/a.png)',
      '![b](<images/b.png>)',
      '<img src="images/c.png">',
      "<img alt='d' src='images/d.webp'>",
      '![remote](https://example.com/a.png)',
      '![data](data:image/png;base64,xxx)',
      '![file](file:///Users/demo/a.png)',
      '![anchor](#diagram)',
    ].join('\n');

    expect(extractLocalMarkdownImageReferences(markdown)).toEqual([
      'images/a.png',
      'images/b.png',
      'images/c.png',
      'images/d.webp',
    ]);
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
      folderFile('b.svg', 'assets/icons/b.svg', ''),
      folderFile('notes.txt', 'assets/notes.txt', 'text/plain'),
      folderFile('unsafe.png', 'assets/../unsafe.png'),
    ]);

    expect(assets.map((asset) => asset.relativePath)).toEqual(['images/a.png', 'icons/b.svg']);
  });
});
