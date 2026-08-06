import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { KnowledgeFileImportDialog, type KnowledgeImportPreviewItem } from './KnowledgeFileImportDialog';

const previewItems: KnowledgeImportPreviewItem[] = [
  {
    key: 'docs/guide.md',
    name: 'guide.md',
    path: 'docs/guide.md',
    size: 2048,
    assetCount: 1,
    localReferenceCount: 2,
    duplicate: false,
  },
  {
    key: 'manual.pdf',
    name: 'manual.pdf',
    path: 'manual.pdf',
    size: 4096,
    assetCount: 0,
    localReferenceCount: 0,
    duplicate: true,
  },
];

function renderDialog(overrides: Partial<ComponentProps<typeof KnowledgeFileImportDialog>> = {}) {
  const props: ComponentProps<typeof KnowledgeFileImportDialog> = {
    open: true,
    sourceLabel: '',
    items: [],
    selectedKeys: new Set(),
    preparing: false,
    uploading: false,
    onClose: vi.fn(),
    onSelectFiles: vi.fn(),
    onDropFiles: vi.fn(),
    onRemoveItem: vi.fn(),
    onToggleItem: vi.fn(),
    onToggleAll: vi.fn(),
    onUpload: vi.fn(),
    ...overrides,
  };
  render(<KnowledgeFileImportDialog {...props} />);
  return props;
}

describe('KnowledgeFileImportDialog', () => {
  it('offers file, ZIP and folder import from one dialog', () => {
    renderDialog();

    expect(screen.getByRole('heading', { name: '上传文件' })).toBeInTheDocument();
    expect(screen.getByText('待上传文件')).toBeInTheDocument();

    const fileInput = screen.getByTestId('knowledge-import-file-input');
    const zipInput = screen.getByTestId('knowledge-import-zip-input');
    const folderInput = screen.getByTestId('knowledge-import-folder-input');
    const fileInputClick = vi.spyOn(fileInput, 'click');
    const zipInputClick = vi.spyOn(zipInput, 'click');
    const folderInputClick = vi.spyOn(folderInput, 'click');

    fireEvent.click(screen.getByRole('button', { name: '选择文件' }));
    expect(fileInputClick).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'ZIP' }));
    fireEvent.click(screen.getByRole('button', { name: '选择ZIP' }));
    expect(zipInputClick).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: '文件夹' }));
    fireEvent.click(screen.getByRole('button', { name: '选择文件夹' }));
    expect(folderInputClick).toHaveBeenCalledOnce();
    expect(folderInput).toHaveAttribute('webkitdirectory', '');
    expect(folderInput).toHaveAttribute('directory', '');
  });

  it('shows preview files, selection count and disables duplicates', () => {
    const props = renderDialog({
      sourceLabel: 'docs',
      items: previewItems,
      selectedKeys: new Set(['docs/guide.md']),
    });

    expect(screen.getByText(/docs\/guide\.md/)).toBeInTheDocument();
    expect(screen.getByText(/本地图片 1\/2/)).toBeInTheDocument();
    expect(screen.getByText('已存在')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /manual.pdf/ })).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: /guide.md/ }));
    fireEvent.click(screen.getByRole('button', { name: '移除 guide.md' }));
    fireEvent.click(screen.getByRole('button', { name: '上传 1' }));

    expect(props.onToggleItem).toHaveBeenCalledWith('docs/guide.md');
    expect(props.onRemoveItem).toHaveBeenCalledWith('docs/guide.md');
    expect(props.onUpload).toHaveBeenCalledOnce();
  });

  it('passes dropped files to the importer', () => {
    const props = renderDialog();
    const file = new File(['hello'], 'hello.md', { type: 'text/markdown' });
    const dropZone = screen.getByRole('button', { name: '选择文件' });

    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(props.onDropFiles).toHaveBeenCalledWith([file]);
  });

  it('passes the selected source files with their explicit mode', () => {
    const props = renderDialog();
    const file = new File(['doc'], 'guide.md', { type: 'text/markdown' });
    const zip = new File(['zip'], 'docs.zip', { type: 'application/zip' });
    const folderFile = new File(['folder doc'], 'manual.md', { type: 'text/markdown' });
    Object.defineProperty(folderFile, 'webkitRelativePath', { value: 'docs/manual.md' });

    fireEvent.change(screen.getByTestId('knowledge-import-file-input'), { target: { files: [file] } });
    fireEvent.change(screen.getByTestId('knowledge-import-zip-input'), { target: { files: [zip] } });
    fireEvent.change(screen.getByTestId('knowledge-import-folder-input'), { target: { files: [folderFile] } });

    expect(props.onSelectFiles).toHaveBeenNthCalledWith(1, 'files', [file]);
    expect(props.onSelectFiles).toHaveBeenNthCalledWith(2, 'zip', [zip]);
    expect(props.onSelectFiles).toHaveBeenNthCalledWith(3, 'folder', [folderFile]);
  });
});
