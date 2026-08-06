import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/contexts/ToastContext';
import type { CapabilityDefaultDTO, DatasetDTO, ExecutableLLMConfigDTO, LLMCapability, LLMScope } from '@/types/api';
import DatasetsPage from './index';

const datasetServices = vi.hoisted(() => ({
  createDataset: vi.fn(),
  deleteDataset: vi.fn(),
  getDatasets: vi.fn(),
  updateDataset: vi.fn(),
}));
const llmServices = vi.hoisted(() => ({
  getLLMCapabilityDefaults: vi.fn(),
  getLLMConfigs: vi.fn(),
}));

vi.mock('@/services/dataset', () => datasetServices);
vi.mock('@/services/llm', () => llmServices);

function config(
  configId: number,
  capability: LLMCapability,
  displayName: string,
  scope: LLMScope = 'USER',
): ExecutableLLMConfigDTO {
  return {
    configId,
    scope,
    providerId: configId,
    providerType: 'test',
    providerName: '测试厂商',
    modelName: `model-${configId}`,
    displayName,
    capability,
    protocol: 'openai',
    apiKeyMasked: '***',
    apiBaseUrl: 'https://example.test/v1',
    isActive: true,
    editable: scope === 'USER',
    snapshotVersion: 1,
    createdAt: '2026-07-28T00:00:00Z',
    updatedAt: '2026-07-28T00:00:00Z',
  };
}

const denseConfigs = [config(11, 'EMBEDDING', '稠密候选一'), config(12, 'EMBEDDING', '稠密平台模型', 'SYSTEM')];
const sparseConfigs = [config(21, 'SPARSE_EMBEDDING', '稀疏候选一'), config(22, 'SPARSE_EMBEDDING', '稀疏候选二')];

function setupModelResponses(defaults: CapabilityDefaultDTO[], options: { dense?: boolean; sparse?: boolean } = {}) {
  llmServices.getLLMCapabilityDefaults.mockResolvedValue(defaults);
  llmServices.getLLMConfigs.mockImplementation(({ capability }: { capability?: LLMCapability }) => {
    if (capability === 'EMBEDDING') return Promise.resolve(options.dense === false ? [] : denseConfigs);
    if (capability === 'SPARSE_EMBEDDING') return Promise.resolve(options.sparse === false ? [] : sparseConfigs);
    return Promise.resolve([]);
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <DatasetsPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

async function openCreateDialog() {
  await waitFor(() => expect(llmServices.getLLMConfigs).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getAllByRole('button', { name: '新建知识库' })[0]);
  await screen.findByRole('heading', { name: '新建知识库' });
}

function selectorButton(label: string) {
  const labelElement = screen.getByText(label, { selector: 'label' });
  return within(labelElement.parentElement as HTMLElement).getByRole('button');
}

describe('dataset creation model defaults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    datasetServices.getDatasets.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
      totalPages: 0,
    });
    datasetServices.createDataset.mockResolvedValue({
      id: 1,
      name: '新知识库',
      description: null,
      status: 'ACTIVE',
      createdAt: '2026-07-28T00:00:00Z',
      updatedAt: '2026-07-28T00:00:00Z',
    } satisfies DatasetDTO);
  });

  it('preselects executable dense and sparse user defaults instead of list order', async () => {
    setupModelResponses([
      { capability: 'EMBEDDING', configId: 12 },
      { capability: 'SPARSE_EMBEDDING', configId: 22 },
    ]);

    renderPage();
    await openCreateDialog();

    expect(selectorButton('稠密向量模型')).toHaveAttribute('data-config-id', '12');
    expect(selectorButton('稀疏向量模型')).toHaveAttribute('data-config-id', '22');
  });

  it('keeps both selectors empty when candidates exist but user defaults are unset', async () => {
    setupModelResponses([
      { capability: 'EMBEDDING', configId: null },
      { capability: 'SPARSE_EMBEDDING', configId: null },
    ]);

    renderPage();
    await openCreateDialog();
    fireEvent.change(screen.getByPlaceholderText('输入知识库名称'), { target: { value: '需要选择模型' } });

    expect(selectorButton('稠密向量模型')).not.toHaveAttribute('data-config-id');
    expect(selectorButton('稀疏向量模型')).not.toHaveAttribute('data-config-id');
    expect(screen.getByRole('button', { name: '创建' })).toBeDisabled();
  });

  it('submits the manually selected SYSTEM and USER configs instead of the defaults', async () => {
    setupModelResponses([
      { capability: 'EMBEDDING', configId: 11 },
      { capability: 'SPARSE_EMBEDDING', configId: 21 },
    ]);

    renderPage();
    await openCreateDialog();

    fireEvent.click(selectorButton('稠密向量模型'));
    fireEvent.click(await screen.findByRole('option', { name: /稠密平台模型/ }));
    fireEvent.click(selectorButton('稀疏向量模型'));
    fireEvent.click(await screen.findByRole('option', { name: /稀疏候选二/ }));
    fireEvent.change(screen.getByPlaceholderText('输入知识库名称'), { target: { value: '新知识库' } });
    fireEvent.click(screen.getByRole('button', { name: '创建' }));

    await waitFor(() =>
      expect(datasetServices.createDataset).toHaveBeenCalledWith({
        name: '新知识库',
        dense_embedding_config_id: 12,
        sparse_embedding_config_id: 22,
      }),
    );
  });

  it.each([
    ['dense', { dense: false }, '稠密向量模型', '请先配置并启用稠密向量模型'],
    ['sparse', { sparse: false }, '稀疏向量模型', '请先配置并启用稀疏向量模型'],
  ] as const)(
    'blocks creation when the %s capability has no executable candidate',
    async (_name, options, label, guide) => {
      setupModelResponses([], options);

      renderPage();
      await openCreateDialog();
      fireEvent.change(screen.getByPlaceholderText('输入知识库名称'), { target: { value: '无法创建' } });

      expect(selectorButton(label)).toBeDisabled();
      expect(screen.getByText(guide)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '创建' })).toBeDisabled();
      expect(datasetServices.createDataset).not.toHaveBeenCalled();
    },
  );
});
