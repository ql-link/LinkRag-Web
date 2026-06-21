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
        status: 'success',
        createdAt: '2026-06-21T13:05:25',
      },
    ]);

    expect(messages).toEqual([
      {
        id: '11002:user',
        role: 'user',
        content: '讲一讲AQS',
        createdAt: '2026-06-21T13:05:25',
      },
      {
        id: '11002:assistant',
        role: 'assistant',
        content: 'AQS 是 Java 并发包中的基础框架。',
        configId: 10147,
        modelName: 'qwen3-max',
        status: 'success',
        createdAt: '2026-06-21T13:05:25',
        references: ['chunk-1'],
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
        role: 'user',
        content: '问题',
        createdAt: undefined,
      },
      {
        id: '2:assistant',
        role: 'assistant',
        content: '本轮回答生成失败。',
        configId: undefined,
        modelName: undefined,
        status: 'failed',
        createdAt: undefined,
        references: [],
      },
    ]);
  });
});
