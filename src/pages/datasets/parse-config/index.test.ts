import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VALUES,
  GROUPS,
  hydrateEnabledModelDefaults,
  normalizeConfig,
  toRequest,
  validateModelBindings,
  validateValues,
} from './config-model';

const PARAMS = GROUPS.flatMap((group) => group.params);

describe('dataset parse config mapping', () => {
  it('keeps the Markdown enhancement model out of the parameter cards', () => {
    const enhancement = GROUPS.find((group) => group.id === 'enhancement');

    expect(enhancement?.params.map((param) => param.key)).toEqual([
      'enable_table_enhancement',
      'enable_image_enhancement',
      'enable_heading_hierarchy',
    ]);
  });

  it('fills frontend defaults from the Python dataset config model', () => {
    const values = normalizeConfig({});

    expect(values).toMatchObject({
      sparse_embedding_config_id: null,
      dense_embedding_config_id: null,
      enhancement_chat_config_id: null,
      enhancement_vision_config_id: null,
      rerank_config_id: null,
      max_chunk_tokens: 512,
      hard_max_tokens: 1024,
      stage_two_algorithm: 'noop',
      protected_neighbor_overlap: false,
      enable_heading_hierarchy: false,
      enable_table_enhancement: false,
      enable_image_enhancement: false,
      enable_rerank: false,
      recall_result_limit: 64,
      bm25_top_k: 100,
      sparse_top_k: 50,
      dense_top_k: 100,
      recall_fusion_strategy: 'rrf',
      fusion_bm25_weight: 0.2,
      fusion_sparse_weight: 0.3,
      fusion_dense_weight: 0.5,
    });
  });

  it('serializes all Java parse-config fields with snake_case keys', () => {
    const request = toRequest({
      ...DEFAULT_VALUES,
      sparse_embedding_config_id: 11,
      dense_embedding_config_id: 12,
      enhancement_chat_config_id: 13,
      enhancement_vision_config_id: 14,
      rerank_config_id: 15,
      stage_two_algorithm: 'semantic_depth_window',
      protected_neighbor_overlap: true,
      enable_heading_hierarchy: true,
      enable_table_enhancement: true,
      enable_image_enhancement: true,
      enable_rerank: true,
      recall_fusion_strategy: 'weighted_score',
    });

    expect(request).toMatchObject({
      sparse_embedding_config_id: 11,
      dense_embedding_config_id: 12,
      enhancement_chat_config_id: 13,
      enhancement_vision_config_id: 14,
      rerank_config_id: 15,
      chunking: {
        max_chunk_tokens: 512,
        hard_max_tokens: 1024,
        stage_two_algorithm: 'semantic_depth_window',
        protected_neighbor_overlap: true,
      },
      enhancement: {
        enable_heading_hierarchy: true,
      },
      recall: {
        enable_rerank: true,
        bm25_top_k: 100,
        recall_fusion_strategy: 'weighted_score',
        fusion_bm25_weight: 0.2,
        fusion_sparse_weight: 0.3,
        fusion_dense_weight: 0.5,
      },
    });
    expect('sparse_embedding_config_source' in request).toBe(false);
    expect('dense_embedding_config_source' in request).toBe(false);
  });

  it('restores all five selections by configId when their features are enabled', () => {
    const values = normalizeConfig({
      dense_embedding_config_id: 11,
      sparse_embedding_config_id: 12,
      enhancement_chat_config_id: 13,
      enhancement_vision_config_id: 14,
      rerank_config_id: 15,
      enhancement: {
        enable_table_enhancement: true,
        enable_image_enhancement: true,
        enable_heading_hierarchy: true,
      },
      recall: { enable_rerank: true },
    });

    expect(values).toMatchObject({
      dense_embedding_config_id: 11,
      sparse_embedding_config_id: 12,
      enhancement_chat_config_id: 13,
      enhancement_vision_config_id: 14,
      rerank_config_id: 15,
    });
  });

  it('hydrates only enabled missing model bindings without overriding saved bindings', () => {
    const values = hydrateEnabledModelDefaults(
      {
        ...DEFAULT_VALUES,
        enhancement_chat_config_id: 91,
        enable_table_enhancement: true,
        enable_heading_hierarchy: true,
        enable_image_enhancement: true,
        enable_rerank: true,
      },
      { CHAT: 11, VISION: 12, RERANK: 13 },
    );

    expect(values).toMatchObject({
      enhancement_chat_config_id: 91,
      enhancement_vision_config_id: 12,
      rerank_config_id: 13,
    });
  });

  it('does not persist defaults for optional capabilities while their features are disabled', () => {
    expect(
      hydrateEnabledModelDefaults(DEFAULT_VALUES, {
        CHAT: 11,
        VISION: 12,
        RERANK: 13,
      }),
    ).toMatchObject({
      enhancement_chat_config_id: null,
      enhancement_vision_config_id: null,
      rerank_config_id: null,
    });
  });

  it.each(['enable_table_enhancement', 'enable_heading_hierarchy'] as const)(
    'uses the shared CHAT default when %s is enabled',
    (feature) => {
      const values = hydrateEnabledModelDefaults({ ...DEFAULT_VALUES, [feature]: true }, { CHAT: 11 });

      expect(values.enhancement_chat_config_id).toBe(11);
    },
  );

  it.each([
    [{ dense_embedding_config_id: null }, 'dense_embedding_config_id', '请选择稠密向量模型'],
    [{ sparse_embedding_config_id: null }, 'sparse_embedding_config_id', '请选择稀疏向量模型'],
    [
      { enable_table_enhancement: true, enhancement_chat_config_id: null },
      'enhancement_chat_config_id',
      '请选择增强对话模型',
    ],
    [
      { enable_heading_hierarchy: true, enhancement_chat_config_id: null },
      'enhancement_chat_config_id',
      '请选择增强对话模型',
    ],
    [
      { enable_image_enhancement: true, enhancement_vision_config_id: null },
      'enhancement_vision_config_id',
      '请选择增强视觉模型',
    ],
    [{ enable_rerank: true, rerank_config_id: null }, 'rerank_config_id', '请选择重排模型'],
  ])('validates conditional model binding %s', (overrides, field, message) => {
    const errors = validateModelBindings({
      ...DEFAULT_VALUES,
      dense_embedding_config_id: 1,
      sparse_embedding_config_id: 2,
      ...overrides,
    });
    expect(errors[field as keyof typeof errors]).toBe(message);
  });

  it('validates token bounds and weighted-score active weight sum', () => {
    const errors = validateValues(
      {
        ...DEFAULT_VALUES,
        min_candidate_chunk_tokens: 256,
        max_chunk_tokens: 255,
        hard_max_tokens: 1024,
        recall_fusion_strategy: 'weighted_score',
        fusion_bm25_weight: 0,
        fusion_sparse_weight: 0,
        fusion_dense_weight: 0,
      },
      PARAMS,
    );

    expect(errors.max_chunk_tokens).toContain('不能小于 256');

    const hardMaxErrors = validateValues(
      {
        ...DEFAULT_VALUES,
        max_chunk_tokens: 1024,
        hard_max_tokens: 512,
      },
      PARAMS,
    );
    expect(hardMaxErrors.hard_max_tokens).toContain('目标块最大 token');
    expect(errors.fusion_bm25_weight).toContain('权重之和');
    expect(errors.fusion_sparse_weight).toContain('权重之和');
    expect(errors.fusion_dense_weight).toContain('权重之和');
  });
});
