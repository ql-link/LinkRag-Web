import { describe, expect, it } from 'vitest';
import {
  collectMarkdownAssetFiles,
  extractLocalMarkdownImageReferences,
  isMarkdownKnowledgeFile,
  normalizeAssetRelativePath,
  pickMarkdownAssetDirectory,
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

interface TestDirectoryHandle {
  getDirectoryHandle: (name: string) => Promise<TestDirectoryHandle>;
  getFileHandle: (name: string) => Promise<{ getFile: () => Promise<File> }>;
}

type TestDirectoryEntry = File | TestDirectoryHandle;

function directoryHandle(entries: Record<string, TestDirectoryEntry>): TestDirectoryHandle {
  return {
    async getDirectoryHandle(name: string) {
      const entry = entries[name];
      if (!entry || entry instanceof File) {
        throw new Error('Directory not found');
      }
      return entry;
    },
    async getFileHandle(name: string) {
      const entry = entries[name];
      if (!(entry instanceof File)) {
        throw new Error('File not found');
      }
      return {
        async getFile() {
          return entry;
        },
      };
    },
  };
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
      folderFile('c.bmp', 'assets/images/c.bmp', 'image/bmp'),
      folderFile('notes.txt', 'assets/notes.txt', 'text/plain'),
      folderFile('unsafe.png', 'assets/../unsafe.png'),
    ]);

    expect(assets.map((asset) => asset.relativePath)).toEqual(['images/a.png']);
  });

  it('collects only image files referenced by the Markdown document', () => {
    const assets = collectMarkdownAssetFiles(
      [
        folderFile('a.png', 'assets/images/a.png'),
        folderFile('b.png', 'assets/images/b.png'),
        folderFile('c.png', 'assets/images/c.png'),
      ],
      ['./images/a.png', 'images/c.png?version=1'],
    );

    expect(assets.map((asset) => asset.relativePath)).toEqual(['images/a.png', 'images/c.png']);
  });

  it('picks only referenced files from a directory handle', async () => {
    const root = directoryHandle({
      images: directoryHandle({
        'a.png': fileNamed('a.png', 'image/png'),
        'b.png': fileNamed('b.png', 'image/png'),
        'c.svg': fileNamed('c.svg', 'image/svg+xml'),
      }),
    });
    const win = {
      async showDirectoryPicker() {
        return root;
      },
    } as Window & { showDirectoryPicker: () => Promise<typeof root> };

    const assets = await pickMarkdownAssetDirectory(['images/a.png', 'images/c.svg'], win);

    expect(assets?.map((asset) => asset.relativePath)).toEqual(['images/a.png']);
    expect(assets?.map((asset) => asset.file.name)).toEqual(['a.png']);
  });
});
