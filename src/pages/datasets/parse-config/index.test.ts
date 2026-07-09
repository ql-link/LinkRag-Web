import { describe, expect, it } from 'vitest';
import { DEFAULT_VALUES, GROUPS, normalizeConfig, toRequest, validateValues } from './config-model';

const PARAMS = GROUPS.flatMap((group) => group.params);

describe('dataset parse config mapping', () => {
  it('fills frontend defaults from the Python dataset config model', () => {
    const values = normalizeConfig({});

    expect(values).toMatchObject({
      sparse_embedding_config_source: 'USER',
      dense_embedding_config_source: 'USER',
      max_chunk_tokens: 512,
      hard_max_tokens: 1024,
      stage_two_algorithm: 'noop',
      protected_neighbor_overlap: false,
      enable_heading_hierarchy: false,
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
      sparse_embedding_config_source: 'SYSTEM',
      dense_embedding_config_id: 12,
      dense_embedding_config_source: 'USER',
      stage_two_algorithm: 'semantic_depth_window',
      protected_neighbor_overlap: true,
      enable_heading_hierarchy: true,
      recall_fusion_strategy: 'weighted_score',
    });

    expect(request).toMatchObject({
      sparse_embedding_config_id: 11,
      sparse_embedding_config_source: 'SYSTEM',
      dense_embedding_config_id: 12,
      dense_embedding_config_source: 'USER',
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
        bm25_top_k: 100,
        recall_fusion_strategy: 'weighted_score',
        fusion_bm25_weight: 0.2,
        fusion_sparse_weight: 0.3,
        fusion_dense_weight: 0.5,
      },
    });
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
