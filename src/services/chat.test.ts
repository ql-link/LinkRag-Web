import { describe, expect, it } from 'vitest';
import { toUiMessages } from './chat';

describe('chat message adapter', () => {
  it('converts backend chat turns into UI messages', () => {
    const messages = toUiMessages([
      {
        id: 11002,
        conversationId: 11002,
        query: '讲一讲AQS',
        answer: 'AQS 是 Java 并发包中的基础框架。',
        configId: 10147,
        modelName: 'qwen3-max',
        references: ['chunk-1'],
        requestId: 'req-20260622-001',
        status: 'success',
        createdAt: '2026-06-21T13:05:25',
      },
    ]);

    expect(messages).toEqual([
      {
        id: '11002:user',
        conversationId: 11002,
        role: 'user',
        content: '讲一讲AQS',
        createdAt: '2026-06-21T13:05:25',
        requestId: 'req-20260622-001',
      },
      {
        id: '11002:assistant',
        conversationId: 11002,
        role: 'assistant',
        content: 'AQS 是 Java 并发包中的基础框架。',
        configId: 10147,
        modelName: 'qwen3-max',
        status: 'success',
        createdAt: '2026-06-21T13:05:25',
        references: ['chunk-1'],
        requestId: 'req-20260622-001',
      },
    ]);
  });

  it('handles nullable turn fields without rendering empty success messages', () => {
    expect(
      toUiMessages([
        {
          id: 1,
          conversationId: 1,
          query: null,
          answer: null,
          references: null,
          status: 'success',
        },
      ]),
    ).toEqual([]);
  });

  it('renders a failed turn placeholder when answer is empty', () => {
    expect(
      toUiMessages([
        {
          id: 2,
          conversationId: 1,
          query: '问题',
          answer: '',
          status: 'failed',
        },
      ]),
    ).toEqual([
      {
        id: '2:user',
        conversationId: 1,
        role: 'user',
        content: '问题',
        createdAt: undefined,
        requestId: undefined,
      },
      {
        id: '2:assistant',
        conversationId: 1,
        role: 'assistant',
        content: '本轮回答生成失败。',
        configId: undefined,
        modelName: undefined,
        status: 'failed',
        createdAt: undefined,
        references: [],
        requestId: undefined,
      },
    ]);
  });

  it('renders a partial turn placeholder when answer is empty', () => {
    expect(
      toUiMessages([
        {
          id: 3,
          conversationId: 1,
          query: '问题',
          answer: null,
          status: 'partial',
        },
      ]),
    ).toEqual([
      {
        id: '3:user',
        conversationId: 1,
        role: 'user',
        content: '问题',
        createdAt: undefined,
        requestId: undefined,
      },
      {
        id: '3:assistant',
        conversationId: 1,
        role: 'assistant',
        content: '本轮回答不完整。',
        configId: undefined,
        modelName: undefined,
        status: 'partial',
        createdAt: undefined,
        references: [],
        requestId: undefined,
      },
    ]);
  });
});
