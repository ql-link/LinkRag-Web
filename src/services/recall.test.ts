import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import {
  recall,
  createRecallSession,
  clearRecallSession,
  abortActiveRecall,
  RecallError,
  isRecallError,
  isRecallUnauthorized,
  isRecallAborted,
} from './recall';

// apiClient.post 用于向 Java 申请 session
vi.mock('@/lib/api-client', () => ({
  apiClient: { post: vi.fn() },
}));
import { apiClient } from '@/lib/api-client';
import { RAG_QUERY_MAX_LENGTH, RAG_QUERY_MAX_LENGTH_MESSAGE } from '@/lib/rag-query';
const mockSessionPost = apiClient.post as unknown as Mock;

/** 构造一个流式 SSE Response */
function sseResponse(frames: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const frame of frames) controller.enqueue(encoder.encode(frame));
      controller.close();
    },
  });
  return new Response(stream, {
    status,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

/** 构造一个握手前错误 Response（body 是 {code,message,data} JSON） */
function errorResponse(status: number, code: string, message = 'err'): Response {
  return new Response(JSON.stringify({ code, message, data: null }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const DONE_FRAME =
  'event: recall_done\ndata: {"hits":[{"chunk_id":"1001","doc_id":10,"dataset_id":1,"fused_score":0.92,"scores":{"bm25":8.7},"content":"片段正文"}],"failed_sources":[]}\n\n';

const SESSION = { token: 'tok-1', stream_url: 'https://py.example/api/v1/recall/stream' };

let fetchMock: Mock;

beforeEach(() => {
  clearRecallSession();
  abortActiveRecall();
  mockSessionPost.mockReset();
  mockSessionPost.mockResolvedValue({ ...SESSION });
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

describe('createRecallSession', () => {
  it('归一化 snake_case 字段为 camelCase', async () => {
    mockSessionPost.mockResolvedValue({
      token: 'abc',
      stream_url: 'https://py/stream',
      dataset_ids: [1, 2],
      expires_in: 300,
    });
    const s = await createRecallSession([1, 2]);
    expect(s).toEqual({
      token: 'abc',
      streamUrl: 'https://py/stream',
      datasetIds: [1, 2],
      expiresIn: 300,
    });
  });

  it('请求体显式带上 datasetIds（Java 端 @NotEmpty）', async () => {
    mockSessionPost.mockResolvedValue({ ...SESSION });
    await createRecallSession([1, 2]);
    expect(mockSessionPost).toHaveBeenCalledWith('/api/v1/recall/sessions', { datasetIds: [1, 2] }, expect.any(Object));
  });
});

describe('recall - 请求构造', () => {
  it('happy path 返回 recall_done payload', async () => {
    fetchMock.mockResolvedValue(sseResponse([DONE_FRAME]));
    const result = await recall({ query: 'hello', configId: 77, conversationId: 99, datasetIds: [1] });
    expect(result.hits).toHaveLength(1);
    expect(result.hits[0].chunk_id).toBe('1001');
    expect(result.failed_sources).toEqual([]);
  });

  it('签发 session 时显式带上 datasetIds', async () => {
    fetchMock.mockResolvedValue(sseResponse([DONE_FRAME]));
    await recall({ query: 'hello', configId: 77, conversationId: 99, datasetIds: [1, 2] });
    expect(mockSessionPost).toHaveBeenCalledWith('/api/v1/recall/sessions', { datasetIds: [1, 2] }, expect.any(Object));
  });

  it('带 Authorization: Bearer 头直连 streamUrl', async () => {
    fetchMock.mockResolvedValue(sseResponse([DONE_FRAME]));
    await recall({ query: 'hello', configId: 77, conversationId: 99, datasetIds: [1] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(SESSION.stream_url);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok-1');
  });

  it('stream 请求体含 query + config_id + dataset_ids + conversation_id，不泄漏未知字段', async () => {
    fetchMock.mockResolvedValue(sseResponse([DONE_FRAME]));
    await recall({ query: 'hello', configId: 77, conversationId: 99, datasetIds: [1, 2] });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ query: 'hello', config_id: 77, dataset_ids: [1, 2], conversation_id: 99 });
    expect('user_id' in body).toBe(false);
    expect('top_k' in body).toBe(false);
  });

  it('stream 请求体使用 trim 后的 query', async () => {
    fetchMock.mockResolvedValue(sseResponse([DONE_FRAME]));
    await recall({ query: '  hello  ', configId: 77, conversationId: 99, datasetIds: [1] });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.query).toBe('hello');
  });

  it('空白 query 直接抛 RECALL_INVALID_REQUEST，不发请求', async () => {
    await expect(recall({ query: '   ', configId: 77, conversationId: 99, datasetIds: [1] })).rejects.toMatchObject({
      code: 'RECALL_INVALID_REQUEST',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockSessionPost).not.toHaveBeenCalled();
  });

  it('超长 query 直接抛 RECALL_INVALID_REQUEST，不发请求', async () => {
    await expect(
      recall({ query: 'a'.repeat(RAG_QUERY_MAX_LENGTH + 1), configId: 77, conversationId: 99, datasetIds: [1] }),
    ).rejects.toMatchObject({
      code: 'RECALL_INVALID_REQUEST',
      message: RAG_QUERY_MAX_LENGTH_MESSAGE,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockSessionPost).not.toHaveBeenCalled();
  });

  it('空 datasetIds 直接抛 RECALL_INVALID_REQUEST，不发请求', async () => {
    await expect(recall({ query: 'hello', configId: 77, conversationId: 99, datasetIds: [] })).rejects.toMatchObject({
      code: 'RECALL_INVALID_REQUEST',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockSessionPost).not.toHaveBeenCalled();
  });

  it('缺失/非法 conversationId 直接抛 RECALL_INVALID_REQUEST，不发请求（LINK-181）', async () => {
    await expect(recall({ query: 'hello', configId: 77, datasetIds: [1], conversationId: 0 })).rejects.toMatchObject({
      code: 'RECALL_INVALID_REQUEST',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockSessionPost).not.toHaveBeenCalled();
  });
});

describe('recall - SSE 解析', () => {
  it('跨 chunk 分帧（边界被切开）', async () => {
    fetchMock.mockResolvedValue(sseResponse(['event: recall_done\nda', 'ta: {"hits":[],"failed_sources":[]}\n\n']));
    const result = await recall({ query: 'q', configId: 77, conversationId: 99, datasetIds: [1] });
    expect(result.hits).toEqual([]);
  });

  it('忽略心跳/注释行，转发未知事件给 onEvent', async () => {
    const onEvent = vi.fn();
    fetchMock.mockResolvedValue(
      sseResponse([': keepalive\n\n', 'event: progress\ndata: {"stage":"bm25"}\n\n', DONE_FRAME]),
    );
    await recall({ query: 'q', configId: 77, conversationId: 99, datasetIds: [1], onEvent });
    expect(onEvent).toHaveBeenCalledWith({ event: 'progress', data: { stage: 'bm25' } });
  });

  it('error 事件 reject 对应错误码', async () => {
    fetchMock.mockResolvedValue(
      sseResponse(['event: error\ndata: {"code":"RECALL_TIMEOUT","message":"recall timeout"}\n\n']),
    );
    await expect(recall({ query: 'q', configId: 77, conversationId: 99, datasetIds: [1] })).rejects.toMatchObject({
      code: 'RECALL_TIMEOUT',
      message: 'recall timeout',
    });
  });

  it('流意外结束（无终态）reject RECALL_INTERNAL_ERROR', async () => {
    fetchMock.mockResolvedValue(sseResponse(['event: progress\ndata: {}\n\n']));
    await expect(recall({ query: 'q', configId: 77, conversationId: 99, datasetIds: [1] })).rejects.toMatchObject({
      code: 'RECALL_INTERNAL_ERROR',
    });
  });

  it('answer_delta 逐帧回调 onAnswerDelta，answer_done 作为终态返回 answer', async () => {
    const deltas: string[] = [];
    fetchMock.mockResolvedValue(
      sseResponse([
        'event: answer_delta\ndata: {"text":"你好"}\n\n',
        'event: answer_delta\ndata: {"text":"世界"}\n\n',
        'event: answer_done\ndata: {"answer":"你好世界","hits":[{"chunk_id":"1001","doc_id":10,"dataset_id":1,"fused_score":0.9,"scores":{},"content":"片段正文"}],"failed_sources":[]}\n\n',
      ]),
    );
    const result = await recall({
      query: 'q',
      configId: 77,
      conversationId: 99,
      datasetIds: [1],
      onAnswerDelta: (t) => deltas.push(t),
    });
    expect(deltas).toEqual(['你好', '世界']);
    expect(result.answer).toBe('你好世界');
    expect(result.hits).toHaveLength(1);
  });

  it('空命中 recall_done 作为终态返回（hits 空、无 answer）', async () => {
    fetchMock.mockResolvedValue(sseResponse(['event: recall_done\ndata: {"hits":[],"failed_sources":[]}\n\n']));
    const result = await recall({ query: 'q', configId: 77, conversationId: 99, datasetIds: [1] });
    expect(result.hits).toEqual([]);
    expect(result.answer).toBeUndefined();
  });

  it('模型未配置 error 事件 reject RECALL_MODEL_CONFIG_MISSING', async () => {
    fetchMock.mockResolvedValue(
      sseResponse([
        'event: error\ndata: {"code":"RECALL_MODEL_CONFIG_MISSING","message":"selected model is not configured or unavailable"}\n\n',
      ]),
    );
    await expect(recall({ query: 'q', configId: 77, conversationId: 99, datasetIds: [1] })).rejects.toMatchObject({
      code: 'RECALL_MODEL_CONFIG_MISSING',
    });
  });

  it('生成失败 error 事件 reject RECALL_GENERATION_FAILED', async () => {
    fetchMock.mockResolvedValue(
      sseResponse([
        'event: answer_delta\ndata: {"text":"部分"}\n\n',
        'event: error\ndata: {"code":"RECALL_GENERATION_FAILED","message":"answer generation failed"}\n\n',
      ]),
    );
    await expect(recall({ query: 'q', configId: 77, conversationId: 99, datasetIds: [1] })).rejects.toMatchObject({
      code: 'RECALL_GENERATION_FAILED',
    });
  });
});

describe('recall - 握手前 HTTP 错误码映射', () => {
  const cases: Array<[number, string, string]> = [
    [403, 'RECALL_SCOPE_FORBIDDEN', 'RECALL_SCOPE_FORBIDDEN'],
    [400, 'RECALL_INVALID_REQUEST', 'RECALL_INVALID_REQUEST'],
    [422, 'RECALL_INVALID_REQUEST', 'RECALL_INVALID_REQUEST'],
    [429, 'RECALL_RATE_LIMITED', 'RECALL_RATE_LIMITED'],
  ];
  it.each(cases)('HTTP %i → %s', async (status, code, expected) => {
    fetchMock.mockResolvedValue(errorResponse(status, code));
    await expect(recall({ query: 'q', configId: 77, conversationId: 99, datasetIds: [1] })).rejects.toMatchObject({
      code: expected,
      httpStatus: status,
    });
  });

  it('body 无法解析时按 HTTP 状态码回退', async () => {
    fetchMock.mockResolvedValue(new Response('not json', { status: 429 }));
    await expect(recall({ query: 'q', configId: 77, conversationId: 99, datasetIds: [1] })).rejects.toMatchObject({
      code: 'RECALL_RATE_LIMITED',
    });
  });
});

describe('recall - token 复用与 401 重申', () => {
  it('多次召回复用同一 session（只申请一次 token）', async () => {
    // 每次返回新 Response：ReadableStream 只能读一次
    fetchMock.mockImplementation(() => Promise.resolve(sseResponse([DONE_FRAME])));
    await recall({ query: 'a', configId: 77, conversationId: 99, datasetIds: [1] });
    await recall({ query: 'b', configId: 77, conversationId: 99, datasetIds: [1] });
    expect(mockSessionPost).toHaveBeenCalledTimes(1);
  });

  it('datasetIds 顺序不同但集合相同时仍复用同一 session', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(sseResponse([DONE_FRAME])));
    await recall({ query: 'a', configId: 77, conversationId: 99, datasetIds: [1, 2] });
    await recall({ query: 'b', configId: 77, conversationId: 99, datasetIds: [2, 1] });
    expect(mockSessionPost).toHaveBeenCalledTimes(1);
  });

  it('datasetIds 范围变化时重新签发 session', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(sseResponse([DONE_FRAME])));
    await recall({ query: 'a', configId: 77, conversationId: 99, datasetIds: [1] });
    await recall({ query: 'b', configId: 77, conversationId: 99, datasetIds: [2] });
    expect(mockSessionPost).toHaveBeenCalledTimes(2);
  });

  it('401 时清缓存、回 Java 重申一次后重试成功', async () => {
    mockSessionPost
      .mockResolvedValueOnce({ token: 'old', stream_url: SESSION.stream_url })
      .mockResolvedValueOnce({ token: 'new', stream_url: SESSION.stream_url });
    fetchMock
      .mockResolvedValueOnce(errorResponse(401, 'RECALL_SESSION_UNAUTHORIZED'))
      .mockResolvedValueOnce(sseResponse([DONE_FRAME]));

    const result = await recall({ query: 'q', configId: 77, conversationId: 99, datasetIds: [1] });
    expect(result.hits).toHaveLength(1);
    expect(mockSessionPost).toHaveBeenCalledTimes(2);
    // 重试用了新 token
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer new');
  });

  it('重申后仍 401 则抛出', async () => {
    fetchMock.mockResolvedValue(errorResponse(401, 'RECALL_SESSION_UNAUTHORIZED'));
    await expect(recall({ query: 'q', configId: 77, conversationId: 99, datasetIds: [1] })).rejects.toMatchObject({
      code: 'RECALL_SESSION_UNAUTHORIZED',
    });
    expect(mockSessionPost).toHaveBeenCalledTimes(2);
  });
});

describe('recall - 并发与 abort', () => {
  it('外部 signal abort 后 reject RECALL_ABORTED', async () => {
    const controller = new AbortController();
    // 模拟真实 fetch：signal 已 abort 时立即 reject
    fetchMock.mockImplementation((_url, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const fail = () => reject(new DOMException('aborted', 'AbortError'));
        if (init.signal?.aborted) fail();
        else init.signal?.addEventListener('abort', fail);
      });
    });
    const promise = recall({
      query: 'q',
      configId: 77,
      conversationId: 99,
      datasetIds: [1],
      signal: controller.signal,
    });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ code: 'RECALL_ABORTED' });
  });

  it('发起新召回会 abort 上一个进行中的连接', async () => {
    const aborted: boolean[] = [];
    fetchMock.mockImplementation((_url, init: RequestInit) => {
      return new Promise((resolve, reject) => {
        const fail = () => {
          aborted.push(true);
          reject(new DOMException('aborted', 'AbortError'));
        };
        if (init.signal?.aborted) return fail();
        init.signal?.addEventListener('abort', fail);
        // 第二个调用（未被 abort）立即完成
        if (fetchMock.mock.calls.length === 2) resolve(sseResponse([DONE_FRAME]));
      });
    });
    const first = recall({ query: 'a', configId: 77, conversationId: 99, datasetIds: [1] });
    const second = recall({ query: 'b', configId: 77, conversationId: 99, datasetIds: [1] });
    await expect(first).rejects.toMatchObject({ code: 'RECALL_ABORTED' });
    await expect(second).resolves.toMatchObject({ hits: expect.any(Array) });
    expect(aborted.length).toBe(1);
  });
});

describe('错误类型守卫', () => {
  it('isRecallError / isRecallUnauthorized / isRecallAborted', () => {
    expect(isRecallError(new RecallError('RECALL_TIMEOUT', 'x'))).toBe(true);
    expect(isRecallError(new Error('x'))).toBe(false);
    expect(isRecallUnauthorized(new RecallError('RECALL_SESSION_UNAUTHORIZED', 'x'))).toBe(true);
    expect(isRecallUnauthorized(new RecallError('RECALL_TIMEOUT', 'x'))).toBe(false);
    expect(isRecallAborted(new RecallError('RECALL_ABORTED', 'x'))).toBe(true);
  });
});
