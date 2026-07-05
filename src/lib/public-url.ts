const OSS_PUBLIC_PATH_PREFIX = '/tolink-public/';
const OSS_PUBLIC_ORIGINS = ['http://103.205.254.30:39000', 'http://100.86.10.52:9000'];
const RAG_STREAM_URL = 'http://117.72.214.40:8000/api/v1/rag/stream';

export function normalizePublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  return OSS_PUBLIC_ORIGINS.reduce(
    (normalizedUrl, origin) => normalizedUrl.replaceAll(`${origin}${OSS_PUBLIC_PATH_PREFIX}`, OSS_PUBLIC_PATH_PREFIX),
    url,
  );
}

export function normalizePublicUrlsInPayload<T>(value: T): T {
  if (typeof value === 'string') {
    return normalizePublicUrl(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizePublicUrlsInPayload(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizePublicUrlsInPayload(item)]),
    ) as T;
  }

  return value;
}

export function normalizeRecallStreamUrl(url: string): string {
  return url === RAG_STREAM_URL ? '/api/v1/rag/stream' : url;
}
