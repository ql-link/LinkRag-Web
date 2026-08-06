import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastContainer, ToastProvider } from '@/contexts/ToastContext';
import type {
  CapabilityDefaultDTO,
  DatasetDTO,
  DatasetParseConfigDTO,
  ExecutableLLMConfigDTO,
  LLMCapability,
} from '@/types/api';
import DatasetParseConfigPage from './index';

const datasetServices = vi.hoisted(() => ({
  getDataset: vi.fn(),
  getDatasetParseConfig: vi.fn(),
  updateDatasetParseConfig: vi.fn(),
}));
const llmServices = vi.hoisted(() => ({
  getLLMCapabilityDefaults: vi.fn(),
  getLLMConfigs: vi.fn(),
}));

vi.mock('@/services/dataset', () => datasetServices);
vi.mock('@/services/llm', () => llmServices);

function config(configId: number, capability: LLMCapability, displayName: string): ExecutableLLMConfigDTO {
  return {
    configId,
    scope: 'USER',
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
    editable: true,
    snapshotVersion: 1,
    createdAt: '2026-07-28T00:00:00Z',
    updatedAt: '2026-07-28T00:00:00Z',
  };
}

const allConfigs = [
  config(31, 'EMBEDDING', '稠密模型'),
  config(32, 'SPARSE_EMBEDDING', '稀疏模型'),
  config(11, 'CHAT', '对话模型一'),
  config(12, 'CHAT', '对话模型二'),
  config(21, 'VISION', '视觉模型一'),
  config(22, 'VISION', '视觉模型二'),
  config(41, 'RERANK', '重排模型一'),
];

function parseConfig(overrides: DatasetParseConfigDTO = {}): DatasetParseConfigDTO {
  return {
    dense_embedding_config_id: 31,
    sparse_embedding_config_id: 32,
    enhancement_chat_config_id: null,
    enhancement_vision_config_id: null,
    rerank_config_id: null,
    enhancement: {
      enable_table_enhancement: false,
      enable_image_enhancement: false,
      enable_heading_hierarchy: false,
    },
    recall: { enable_rerank: false },
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/datasets/1/parse-config']}>
      <ToastProvider>
        <Routes>
          <Route path="/datasets/:id/parse-config" element={<DatasetParseConfigPage />} />
        </Routes>
        <ToastContainer />
      </ToastProvider>
    </MemoryRouter>,
  );
}

function selectorButton(label: string) {
  const labelElement = screen.getByText(label, { selector: 'label' });
  return within(labelElement.parentElement as HTMLElement).getByRole('button');
}

describe('dataset parse config model defaults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    datasetServices.getDataset.mockResolvedValue({
      id: 1,
      name: '测试知识库',
      description: null,
      status: 'ACTIVE',
      createdAt: '2026-07-28T00:00:00Z',
      updatedAt: '2026-07-28T00:00:00Z',
    } satisfies DatasetDTO);
    datasetServices.getDatasetParseConfig.mockResolvedValue(parseConfig());
    datasetServices.updateDatasetParseConfig.mockResolvedValue(undefined);
    llmServices.getLLMConfigs.mockResolvedValue(allConfigs);
    llmServices.getLLMCapabilityDefaults.mockResolvedValue([]);
  });

  it('renders only one CHAT and one VISION selector while saved bindings win over newer defaults', async () => {
    datasetServices.getDatasetParseConfig.mockResolvedValue(
      parseConfig({
        enhancement_chat_config_id: 11,
        enhancement_vision_config_id: 21,
        enhancement: {
          enable_table_enhancement: true,
          enable_image_enhancement: true,
          enable_heading_hierarchy: true,
        },
      }),
    );
    llmServices.getLLMCapabilityDefaults.mockResolvedValue([
      { capability: 'CHAT', configId: 12 },
      { capability: 'VISION', configId: 22 },
    ] satisfies CapabilityDefaultDTO[]);

    renderPage();
    await screen.findByRole('heading', { name: 'Markdown 增强' });

    expect(screen.getAllByText('增强对话模型', { selector: 'label' })).toHaveLength(1);
    expect(screen.getAllByText('增强视觉模型', { selector: 'label' })).toHaveLength(1);
    expect(selectorButton('增强对话模型')).toHaveAttribute('data-config-id', '11');
    expect(selectorButton('增强视觉模型')).toHaveAttribute('data-config-id', '21');
    expect(selectorButton('增强对话模型')).toHaveClass('bg-transparent', 'px-0');
    expect(selectorButton('增强视觉模型')).toHaveClass('bg-transparent', 'px-0');
    expect(selectorButton('增强对话模型').querySelector('.lucide-chevron-down')).toBeNull();
    expect(selectorButton('增强视觉模型').querySelector('.lucide-chevron-down')).toBeNull();
    expect(selectorButton('稠密向量模型')).toHaveClass('px-0');
    expect(selectorButton('稀疏向量模型')).toHaveClass('px-0');
    expect(screen.queryByText('提交全局 configId')).not.toBeInTheDocument();
    expect(screen.queryByText('已绑定，不可修改')).not.toBeInTheDocument();
    const tableGroup = screen.getByRole('group', { name: '表格增强' });
    const imageGroup = screen.getByRole('group', { name: '图片增强' });
    const headingGroup = screen.getByRole('group', { name: '标题层级重建' });
    expect(within(tableGroup).getByText('增强对话模型', { selector: 'label' })).toBeInTheDocument();
    expect(within(imageGroup).getByText('增强视觉模型', { selector: 'label' })).toBeInTheDocument();
    expect(headingGroup.compareDocumentPosition(tableGroup) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(headingGroup.compareDocumentPosition(imageGroup) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    expect(screen.queryByText('表格增强模型')).not.toBeInTheDocument();
    expect(screen.queryByText('图片增强模型')).not.toBeInTheDocument();
    expect(screen.queryByText('未配置默认模型')).not.toBeInTheDocument();
    expect(datasetServices.updateDatasetParseConfig).not.toHaveBeenCalled();
  });

  it('marks executable defaults as unsaved and persists them once without a second identical update', async () => {
    datasetServices.getDatasetParseConfig.mockResolvedValue(
      parseConfig({
        enhancement: {
          enable_table_enhancement: true,
          enable_image_enhancement: true,
          enable_heading_hierarchy: false,
        },
      }),
    );
    llmServices.getLLMCapabilityDefaults.mockResolvedValue([
      { capability: 'CHAT', configId: 12 },
      { capability: 'VISION', configId: 22 },
    ] satisfies CapabilityDefaultDTO[]);

    renderPage();
    await screen.findByRole('heading', { name: 'Markdown 增强' });

    expect(selectorButton('增强对话模型')).toHaveAttribute('data-config-id', '12');
    expect(selectorButton('增强视觉模型')).toHaveAttribute('data-config-id', '22');
    expect(screen.getAllByText('已按用户默认预选，保存后生效')).toHaveLength(2);

    const saveButton = screen.getByRole('button', { name: '保存配置' });
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);

    await waitFor(() =>
      expect(datasetServices.updateDatasetParseConfig).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          enhancement_chat_config_id: 12,
          enhancement_vision_config_id: 22,
        }),
      ),
    );
    await waitFor(() => expect(saveButton).toBeDisabled());
    fireEvent.click(saveButton);
    expect(datasetServices.updateDatasetParseConfig).toHaveBeenCalledTimes(1);
  });

  it('keeps a shared CHAT selector empty without a default, shows one error, and saves the explicit choice', async () => {
    datasetServices.getDatasetParseConfig.mockResolvedValue(
      parseConfig({
        enhancement: {
          enable_table_enhancement: true,
          enable_image_enhancement: false,
          enable_heading_hierarchy: true,
        },
      }),
    );

    renderPage();
    await screen.findByRole('heading', { name: 'Markdown 增强' });

    expect(selectorButton('增强对话模型')).not.toHaveAttribute('data-config-id');
    expect(screen.getAllByText('请选择增强对话模型')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '保存配置' })).toBeDisabled();

    fireEvent.click(selectorButton('增强对话模型'));
    fireEvent.click(await screen.findByRole('option', { name: /对话模型一/ }));
    fireEvent.click(screen.getByRole('button', { name: '保存配置' }));

    await waitFor(() =>
      expect(datasetServices.updateDatasetParseConfig).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ enhancement_chat_config_id: 11 }),
      ),
    );
  });

  it('shows one actionable VISION repair error for a historical enabled feature without a binding or default', async () => {
    datasetServices.getDatasetParseConfig.mockResolvedValue(
      parseConfig({
        enhancement: {
          enable_table_enhancement: false,
          enable_image_enhancement: true,
          enable_heading_hierarchy: false,
        },
      }),
    );

    renderPage();
    await screen.findByRole('heading', { name: 'Markdown 增强' });

    expect(selectorButton('增强视觉模型')).not.toHaveAttribute('data-config-id');
    expect(screen.getAllByText('请选择增强视觉模型')).toHaveLength(1);
    expect(screen.queryByText('未配置默认模型')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存配置' })).toBeDisabled();
  });

  it.each([
    ['表格增强', 'CHAT', 12, '增强对话模型'],
    ['标题层级重建', 'CHAT', 12, '增强对话模型'],
    ['图片增强', 'VISION', 22, '增强视觉模型'],
    ['启用重排', 'RERANK', 41, '重排模型'],
  ] as const)(
    'preselects the %s user default when the feature is enabled',
    async (feature, capability, configId, selector) => {
      llmServices.getLLMCapabilityDefaults.mockResolvedValue([{ capability, configId }]);

      renderPage();
      await screen.findByRole('heading', { name: 'Markdown 增强' });

      const toggle = screen.getByRole('button', { name: feature });
      fireEvent.click(toggle);

      expect(toggle).toHaveAttribute('aria-pressed', 'true');
      expect(selectorButton(selector)).toHaveAttribute('data-config-id', String(configId));
      expect(screen.getByText('已按用户默认预选，保存后生效')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '保存配置' })).toBeEnabled();
    },
  );

  it.each([
    ['表格增强', 'CHAT', '请先配置并启用 CHAT 能力模型'],
    ['图片增强', 'VISION', '请先配置并启用 VISION 能力模型'],
    ['启用重排', 'RERANK', '请先配置并启用 RERANK 能力模型'],
  ] as const)('does not enable %s when %s has no executable candidate', async (feature, capability, guide) => {
    llmServices.getLLMConfigs.mockResolvedValue(allConfigs.filter((item) => item.capability !== capability));

    renderPage();
    await screen.findByRole('heading', { name: 'Markdown 增强' });

    const toggle = screen.getByRole('button', { name: feature });
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(await screen.findByText(guide)).toBeInTheDocument();
    expect(datasetServices.updateDatasetParseConfig).not.toHaveBeenCalled();
  });

  it('does not hydrate or persist optional defaults while their features are disabled', async () => {
    llmServices.getLLMCapabilityDefaults.mockResolvedValue([
      { capability: 'CHAT', configId: 12 },
      { capability: 'VISION', configId: 22 },
      { capability: 'RERANK', configId: 41 },
    ] satisfies CapabilityDefaultDTO[]);

    renderPage();
    await screen.findByRole('heading', { name: 'Markdown 增强' });

    expect(screen.queryByText('增强对话模型', { selector: 'label' })).not.toBeInTheDocument();
    expect(screen.queryByText('增强视觉模型', { selector: 'label' })).not.toBeInTheDocument();
    expect(screen.queryByText('重排模型', { selector: 'label' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '结构化内容参与重叠' }));
    fireEvent.click(screen.getByRole('button', { name: '保存配置' }));

    await waitFor(() =>
      expect(datasetServices.updateDatasetParseConfig).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          enhancement_chat_config_id: null,
          enhancement_vision_config_id: null,
          rerank_config_id: null,
        }),
      ),
    );
  });

  it('clears prefilled optional model bindings when restoring disabled feature defaults', async () => {
    datasetServices.getDatasetParseConfig.mockResolvedValue(
      parseConfig({
        enhancement: {
          enable_table_enhancement: true,
          enable_image_enhancement: true,
          enable_heading_hierarchy: false,
        },
        recall: { enable_rerank: true },
      }),
    );
    llmServices.getLLMCapabilityDefaults.mockResolvedValue([
      { capability: 'CHAT', configId: 12 },
      { capability: 'VISION', configId: 22 },
      { capability: 'RERANK', configId: 41 },
    ] satisfies CapabilityDefaultDTO[]);

    renderPage();
    await screen.findByRole('heading', { name: 'Markdown 增强' });

    expect(selectorButton('增强对话模型')).toHaveAttribute('data-config-id', '12');
    expect(selectorButton('增强视觉模型')).toHaveAttribute('data-config-id', '22');
    expect(selectorButton('重排模型')).toHaveAttribute('data-config-id', '41');

    fireEvent.click(screen.getByRole('button', { name: '恢复默认' }));
    fireEvent.click(screen.getByRole('button', { name: '保存配置' }));

    await waitFor(() =>
      expect(datasetServices.updateDatasetParseConfig).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          enhancement_chat_config_id: null,
          enhancement_vision_config_id: null,
          rerank_config_id: null,
          enhancement: {
            enable_table_enhancement: false,
            enable_image_enhancement: false,
            enable_heading_hierarchy: false,
          },
          recall: expect.objectContaining({ enable_rerank: false }),
        }),
      ),
    );
  });
});
