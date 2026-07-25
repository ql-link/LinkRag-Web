import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ postForm: vi.fn() }));
vi.mock('@/lib/api-client', () => ({ apiClient: { postForm: mocks.postForm } }));

import { uploadKnowledgeFile } from './dataset';

describe('uploadKnowledgeFile', () => {
  beforeEach(() => mocks.postForm.mockReset());

  it('keeps multipart asset files and paths aligned', async () => {
    mocks.postForm.mockResolvedValue({ id: 1 });
    const markdown = new File(['![a](images/a.png)'], 'guide.md', { type: 'text/markdown' });
    const image = new File(['png'], 'a.png', { type: 'image/png' });

    await uploadKnowledgeFile(2, markdown, true, {
      matchMode: 'FULL_PATH',
      documentPath: 'docs/guide.md',
      assets: [{ file: image, relativePath: 'images/a.png' }],
      inventoryPaths: ['images/a.png', 'images/unused.png'],
    });

    const form = mocks.postForm.mock.calls[0][1] as FormData;
    expect(form.get('matchMode')).toBe('FULL_PATH');
    expect(form.get('documentPath')).toBe('docs/guide.md');
    expect(form.getAll('assets')).toEqual([image]);
    expect(form.getAll('assetRelativePaths')).toEqual(['images/a.png']);
    expect(form.getAll('assetInventoryPaths')).toEqual(['images/a.png', 'images/unused.png']);
  });
});
