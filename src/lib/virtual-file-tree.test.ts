import { describe, expect, it } from 'vitest';
import { buildDocumentPackage, virtualFilesFromFolder } from './virtual-file-tree';

function folderFile(name: string, path: string, content = 'image') {
  const file = new File([content], name);
  Object.defineProperty(file, 'webkitRelativePath', { value: path });
  return file;
}

describe('virtual file tree', () => {
  it('matches full relative paths and only carries referenced images', async () => {
    const files = [
      folderFile('guide.md', 'dataset/docs/guide.md', '![a](../images/a.png)'),
      folderFile('a.png', 'dataset/images/a.png'),
      folderFile('unused.png', 'dataset/images/unused.png'),
    ];
    const tree = virtualFilesFromFolder(files);

    const result = await buildDocumentPackage(tree[0], tree);

    expect(result.documentPath).toBe('docs/guide.md');
    expect(result.matchMode).toBe('FULL_PATH');
    expect(result.assets.map((asset) => asset.relativePath)).toEqual(['images/a.png']);
    expect(result.inventoryPaths).toContain('images/unused.png');
  });

  it('does not degrade standard Markdown full-path matching to basename', async () => {
    const files = [
      folderFile('guide.md', 'dataset/docs/guide.md', '![a](images/a.png)'),
      folderFile('a.png', 'dataset/other/a.png'),
    ];
    const tree = virtualFilesFromFolder(files);

    const result = await buildDocumentPackage(tree[0], tree);

    expect(result.assets).toEqual([]);
  });
});
