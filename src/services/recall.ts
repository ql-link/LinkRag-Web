import { apiClient } from '@/lib/api-client';
import type { RecallSessionDTO, RecallDonePayload, RecallErrorPayload, RecallStreamEvent } from '@/types/api';

// LINK-105：前端直连 Python 召回 SSE。
//
// 两步建连：
//   1. 带登录态 POST /api/v1/recall/sessions（经 apiClient，自动带 satoken）→ 拿短期 token + streamUrl。
//   2. 直连 Python：fetch 流式（ReadableStream）连 streamUrl，带 Authorization: Bearer。
//      不能用 EventSource——它无法设 Authorization 头。

/** 召回错误码：握手前 HTTP 错误 + 握手后 error 事件 + 客户端本地错误。 */
export type RecallErrorCode =
  // 握手前 HTTP 错误（流未开始）
  | 'RECALL_SESSION_UNAUTHORIZED' // 401：token 缺失/过期/无效 → 回 Java 重申 token
  | 'RECALL_SCOPE_FORBIDDEN' // 403：datasetIds 越权 → 收敛到授权范围
  | 'RECALL_INVALID_REQUEST' // 400/422：参数问题（空 query / 未知字段）→ 修正
  | 'RECALL_RATE_LIMITED' // 429：并发流超限 → 退避重试 / 提示已有召回进行中
  // 握手后 error 事件
  | 'RECALL_ALL_SOURCES_FAILED'
  | 'RECALL_TIMEOUT'
  | 'RECALL_INTERNAL_ERROR'
  | 'RECALL_MODEL_CONFIG_MISSING' // 所选模型未配置 / 不属本人 / 非 CHAT / 已停用 → 前置失败
  | 'RECALL_GENERATION_FAILED' // 生成阶段 LLM 失败 → 整请求失败
  // 客户端本地
  | 'RECALL_ABORTED' // 主动 abort
  | 'RECALL_NETWORK_ERROR' // fetch 失败 / 流中断
  | 'RECALL_UNKNOWN';

const HTTP_STATUS_TO_CODE: Record<number, RecallErrorCode> = {
  400: 'RECALL_INVALID_REQUEST',
  401: 'RECALL_SESSION_UNAUTHORIZED',
  403: 'RECALL_SCOPE_FORBIDDEN',
  422: 'RECALL_INVALID_REQUEST',
  429: 'RECALL_RATE_LIMITED',
};

const KNOWN_CODES: ReadonlySet<string> = new Set<RecallErrorCode>([
  'RECALL_SESSION_UNAUTHORIZED',
  'RECALL_SCOPE_FORBIDDEN',
  'RECALL_INVALID_REQUEST',
  'RECALL_RATE_LIMITED',
  'RECALL_ALL_SOURCES_FAILED',
  'RECALL_TIMEOUT',
  'RECALL_INTERNAL_ERROR',
  'RECALL_MODEL_CONFIG_MISSING',
  'RECALL_GENERATION_FAILED',
  'RECALL_ABORTED',
  'RECALL_NETWORK_ERROR',
  'RECALL_UNKNOWN',
]);

export class RecallError extends Error {
  constructor(
    public code: RecallErrorCode,
    message: string,
    /** 握手前错误的 HTTP 状态码（握手后错误为 undefined） */
    public httpStatus?: number,
  ) {
    super(message);
    this.name = 'RecallError';
  }
}

export function isRecallError(error: unknown): error is RecallError {
  return error instanceof RecallError;
}

/** token 过期需回 Java 重申（401）。 */
export function isRecallUnauthorized(error: unknown): boolean {
  return isRecallError(error) && error.code === 'RECALL_SESSION_UNAUTHORIZED';
}

/** 用户主动断开，调用方通常应静默忽略（不弹 toast）。 */
export function isRecallAborted(error: unknown): boolean {
  return isRecallError(error) && error.code === 'RECALL_ABORTED';
}

function normalizeErrorCode(raw: unknown, fallback: RecallErrorCode): RecallErrorCode {
  return typeof raw === 'string' && KNOWN_CODES.has(raw) ? (raw as RecallErrorCode) : fallback;
}

// ── 1. 申请 session token（向 Java，带登录态） ──────────────────────────────

/** 后端原始返回，兼容 snake_case / camelCase。 */
interface RawRecallSession {
  token: string;
  streamUrl?: string;
  stream_url?: string;
  datasetIds?: number[];
  dataset_ids?: number[];
  expiresIn?: number;
  expires_in?: number;
}

/**
 * 向 Java 申请短期召回 session（LINK-104）。
 * 走 apiClient（自动带登录态 satoken 头、按 Result 解包）。
 *
 * <p>{@code datasetIds} 必须显式非空：Java 端 {@code @NotEmpty} 强校验，缺省/空列表会被 400 拒绝
 * （避免下发空 dataset_ids claim 被 Python 误判为「全库授权」造成越权放大）。</p>
 */
export async function createRecallSession(datasetIds: number[], signal?: AbortSignal): Promise<RecallSessionDTO> {
  const raw = await apiClient.post<RawRecallSession>('/api/v1/recall/sessions', { datasetIds }, { signal });
  return {
    token: raw.token,
    streamUrl: raw.streamUrl ?? raw.stream_url ?? '',
    datasetIds: raw.datasetIds ?? raw.dataset_ids,
    expiresIn: raw.expiresIn ?? raw.expires_in,
  };
}

// ── token 复用：未过期前断线重连复用同一 token，401 才回 Java 重申 ──────────

let cachedSession: RecallSessionDTO | null = null;
// 缓存的 session 绑定其授权的 datasetIds——换数据集范围必须重新签发，
// 否则复用旧 scope 的 token 会被 Python 判 403（RECALL_SCOPE_FORBIDDEN）。
let cachedKey: string | null = null;

/** 稳定的 datasetIds 缓存键（去重 + 升序，与顺序无关）。 */
function sessionKey(datasetIds: number[]): string {
  return [...new Set(datasetIds)].sort((a, b) => a - b).join(',');
}

/** 取已缓存 session（需同一 datasetIds 范围），没有则向 Java 申请并缓存。 */
async function getOrCreateSession(datasetIds: number[], signal?: AbortSignal): Promise<RecallSessionDTO> {
  const key = sessionKey(datasetIds);
  if (cachedSession && cachedKey === key) return cachedSession;
  cachedSession = await createRecallSession(datasetIds, signal);
  cachedKey = key;
  return cachedSession;
}

/** 清除缓存 session（token 过期/无效时），下次将回 Java 重申。 */
export function clearRecallSession(): void {
  cachedSession = null;
  cachedKey = null;
}

// ── 单用户并发上限：重连前先 abort 旧连接，否则旧连接占名额导致新连接 429 ────

let activeController: AbortController | null = null;

/** 主动断开当前进行中的召回（abort → Python 取消任务、释放并发名额）。 */
export function abortActiveRecall(): void {
  activeController?.abort();
  activeController = null;
}

// ── SSE 解析 ────────────────────────────────────────────────────────────────

/** 解析单帧的 event / data（每帧含 event: 与 data: 单行 JSON）。 */
function parseFrame(frame: string): RecallStreamEvent | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of frame.split('\n')) {
    if (line.startsWith(':')) continue; // 注释/心跳行
    const idx = line.indexOf(':');
    const field = idx === -1 ? line : line.slice(0, idx);
    // 去掉冒号后一个可选空格（SSE 规范）
    let value = idx === -1 ? '' : line.slice(idx + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value;
    else if (field === 'data') dataLines.push(value);
  }
  if (dataLines.length === 0) return null;
  const rawData = dataLines.join('\n');
  let data: unknown;
  try {
    data = JSON.parse(rawData);
  } catch {
    data = rawData;
  }
  return { event, data };
}

export interface RecallOptions {
  /** 必填，非空非纯空白 */
  query: string;
  /** 必填非空：既用于签发 session token 的授权范围，也作为本次 stream 的检索范围（必须 ⊆ token 授权范围）。 */
  datasetIds: number[];
  /** 必填：本次生成所用 CHAT 模型配置 id（用户在对话页选中的模型）。后端按 (user_id, config_id) 前置校验。 */
  configId: number;
  /** 外部取消信号（组件卸载 / 用户取消）。会与内部并发管理合并。 */
  signal?: AbortSignal;
  /** 流式生成增量回调：每收到一帧 answer_delta 触发，参数为本帧增量文本。 */
  onAnswerDelta?: (text: string) => void;
  /** 转发非终态 / 未知 SSE 帧（前向兼容；recall_done / answer_done / error / answer_delta 不经此回调）。 */
  onEvent?: (event: RecallStreamEvent) => void;
}

/**
 * 直连 Python 拉一次 SSE 流，解析到终态。
 * 成功（recall_done）resolve；error 事件 / 握手前 HTTP 错误 / abort / 网络错误 reject(RecallError)。
 */
async function streamOnce(
  session: RecallSessionDTO,
  options: RecallOptions,
  signal: AbortSignal,
): Promise<RecallDonePayload> {
  // 请求体只允许 query + config_id + dataset_ids——任何未知字段 Python 直接 422。
  //
  // LINK-157：dataset_ids 必须「显式携带」，不能省略。后端按 (user_id, dataset_ids[0])
  // 解析数据集级召回配置（top_k / 分数阈值 / token 预算，见 LINK-148）；省略时会退回
  // token 授权范围里「第一个」数据集或系统默认，生效配置可能与用户正在对话的数据集不符。
  // user_id 只取 session token claims，body 不传（多传也会被 Python 当未知字段 422）。
  // datasetIds 由 recall() 前置校验保证非空，这里恒定写入以让契约显式化。
  const body: { query: string; config_id: number; dataset_ids: number[] } = {
    query: options.query,
    config_id: options.configId,
    dataset_ids: options.datasetIds,
  };

  let resp: Response;
  try {
    resp = await fetch(session.streamUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new RecallError('RECALL_ABORTED', '召回已取消');
    }
    throw new RecallError('RECALL_NETWORK_ERROR', '网络连接异常，请稍后重试');
  }

  // 握手前 HTTP 错误：流未开始，body 是 { code, message, data } JSON。
  if (!resp.ok) {
    let payload: Partial<RecallErrorPayload> = {};
    try {
      payload = await resp.json();
    } catch {
      // 忽略，回退到 HTTP 状态码
    }
    const code = normalizeErrorCode(payload.code, HTTP_STATUS_TO_CODE[resp.status] ?? 'RECALL_UNKNOWN');
    throw new RecallError(code, payload.message || `召回失败 (${resp.status})`, resp.status);
  }

  if (!resp.body) {
    throw new RecallError('RECALL_INTERNAL_ERROR', '召回响应为空');
  }

  // 逐块读流，按 \n\n 分帧。
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const handleFrame = (frame: string): RecallDonePayload | undefined => {
    const parsed = parseFrame(frame);
    if (!parsed) return undefined;
    // 终态：生成完成（answer_done）或空命中不生成（recall_done）。
    if (parsed.event === 'answer_done' || parsed.event === 'recall_done') {
      return parsed.data as RecallDonePayload;
    }
    // 流式增量 token。
    if (parsed.event === 'answer_delta') {
      const delta = parsed.data as { text?: string };
      if (delta?.text) options.onAnswerDelta?.(delta.text);
      return undefined;
    }
    if (parsed.event === 'error') {
      const err = parsed.data as RecallErrorPayload;
      throw new RecallError(normalizeErrorCode(err?.code, 'RECALL_INTERNAL_ERROR'), err?.message || '召回失败');
    }
    options.onEvent?.(parsed);
    return undefined;
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep: number;
      // 兼容 \n\n 与 \r\n\r\n 分帧
      while ((sep = indexOfFrameBoundary(buffer)) !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(boundaryEnd(buffer, sep));
        const result = handleFrame(frame.replace(/\r/g, ''));
        if (result) return result;
      }
    }
    // flush 尾部残帧
    const tail = (buffer + decoder.decode()).trim();
    if (tail) {
      const result = handleFrame(tail.replace(/\r/g, ''));
      if (result) return result;
    }
  } catch (error) {
    if (error instanceof RecallError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new RecallError('RECALL_ABORTED', '召回已取消');
    }
    throw new RecallError('RECALL_NETWORK_ERROR', '召回流中断，请稍后重试');
  } finally {
    reader.releaseLock();
  }

  // 流结束但未收到终态
  throw new RecallError('RECALL_INTERNAL_ERROR', '召回流意外结束');
}

/** 找到帧边界（\n\n 或 \r\n\r\n）起点，没有返回 -1。 */
function indexOfFrameBoundary(buffer: string): number {
  const lf = buffer.indexOf('\n\n');
  const crlf = buffer.indexOf('\r\n\r\n');
  if (lf === -1) return crlf;
  if (crlf === -1) return lf;
  return Math.min(lf, crlf);
}

/** 给定边界起点，返回边界后的下一个字符索引（跳过 \n\n 或 \r\n\r\n）。 */
function boundaryEnd(buffer: string, start: number): number {
  return buffer.startsWith('\r\n\r\n', start) ? start + 4 : start + 2;
}

// ── 主入口 ──────────────────────────────────────────────────────────────────

/**
 * 发起一次召回（直连 Python SSE）。
 *
 * 自动处理：
 *  - 客户端校验 query（空/纯空白直接抛 RECALL_INVALID_REQUEST，不发请求）；
 *  - token 复用：复用已缓存 session，401（token 过期）时回 Java 重申一次并重试；
 *  - 并发管理：发起前先 abort 上一个进行中的召回，避免旧连接占名额导致 429。
 *
 * @returns recall_done 的 payload（hits 已按 fused_score 降序）
 * @throws RecallError 各错误码见 {@link RecallErrorCode}
 */
export async function recall(options: RecallOptions): Promise<RecallDonePayload> {
  if (!options.query || options.query.trim() === '') {
    throw new RecallError('RECALL_INVALID_REQUEST', 'query 不能为空');
  }
  if (!options.datasetIds || options.datasetIds.length === 0) {
    // Java 端 @NotEmpty 必拒，提前本地拦截避免一次必败的 400 请求。
    throw new RecallError('RECALL_INVALID_REQUEST', 'datasetIds 不能为空');
  }

  // 重连前先 abort 旧连接，释放并发名额。
  abortActiveRecall();
  const controller = new AbortController();
  activeController = controller;

  // 合并外部 signal。
  const { signal: external } = options;
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const session = await getOrCreateSession(options.datasetIds, controller.signal);
    try {
      return await streamOnce(session, options, controller.signal);
    } catch (error) {
      // token 过期：清缓存、回 Java 重申一次后重试。
      if (isRecallUnauthorized(error)) {
        clearRecallSession();
        const fresh = await getOrCreateSession(options.datasetIds, controller.signal);
        return await streamOnce(fresh, options, controller.signal);
      }
      throw error;
    }
  } finally {
    if (activeController === controller) activeController = null;
  }
}
