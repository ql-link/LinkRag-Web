const OSS_PUBLIC_ORIGIN = 'http://103.205.254.30:39000';
const OSS_PUBLIC_PATH_PREFIX = '/tolink-public/';
const RAG_STREAM_URL = 'http://117.72.214.40:8000/api/v1/rag/stream';

export function normalizePublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  if (url.startsWith(`${OSS_PUBLIC_ORIGIN}${OSS_PUBLIC_PATH_PREFIX}`)) {
    return url.slice(OSS_PUBLIC_ORIGIN.length);
  }

  return url;
}

export function normalizeRecallStreamUrl(url: string): string {
  return url === RAG_STREAM_URL ? '/api/v1/rag/stream' : url;
}
