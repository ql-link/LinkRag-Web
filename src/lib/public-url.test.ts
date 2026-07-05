import { describe, expect, it } from 'vitest';
import { normalizePublicUrl, normalizePublicUrlsInPayload, normalizeRecallStreamUrl } from './public-url';

describe('normalizePublicUrl', () => {
  it('rewrites the public OSS origin to a same-origin path', () => {
    expect(normalizePublicUrl('http://103.205.254.30:39000/tolink-public/avatar/demo.png')).toBe(
      '/tolink-public/avatar/demo.png',
    );
    expect(normalizePublicUrl('http://100.86.10.52:9000/tolink-public/avatar/demo.png')).toBe(
      '/tolink-public/avatar/demo.png',
    );
  });

  it('leaves other urls unchanged', () => {
    expect(normalizePublicUrl('https://cdn.example.com/avatar.png')).toBe('https://cdn.example.com/avatar.png');
    expect(normalizePublicUrl('/tolink-public/avatar/demo.png')).toBe('/tolink-public/avatar/demo.png');
  });

  it('rewrites public OSS urls embedded in text content', () => {
    expect(normalizePublicUrl('![demo](http://103.205.254.30:39000/tolink-public/blog/demo.png)')).toBe(
      '![demo](/tolink-public/blog/demo.png)',
    );
  });

  it('normalizes empty values to null', () => {
    expect(normalizePublicUrl(null)).toBeNull();
    expect(normalizePublicUrl(undefined)).toBeNull();
    expect(normalizePublicUrl('')).toBeNull();
  });
});

describe('normalizePublicUrlsInPayload', () => {
  it('rewrites public OSS urls nested in api payloads', () => {
    expect(
      normalizePublicUrlsInPayload({
        avatarUrl: 'http://103.205.254.30:39000/tolink-public/avatar/demo.png',
        posts: [
          {
            coverPublicUrl: 'http://100.86.10.52:9000/tolink-public/blog/cover.png',
            contentMarkdown: '![demo](http://103.205.254.30:39000/tolink-public/blog/content.png)',
            title: 'Demo',
          },
        ],
      }),
    ).toEqual({
      avatarUrl: '/tolink-public/avatar/demo.png',
      posts: [
        {
          coverPublicUrl: '/tolink-public/blog/cover.png',
          contentMarkdown: '![demo](/tolink-public/blog/content.png)',
          title: 'Demo',
        },
      ],
    });
  });
});

describe('normalizeRecallStreamUrl', () => {
  it('rewrites the public Python stream endpoint to a same-origin path', () => {
    expect(normalizeRecallStreamUrl('http://117.72.214.40:8000/api/v1/rag/stream')).toBe('/api/v1/rag/stream');
  });

  it('leaves other stream urls unchanged', () => {
    expect(normalizeRecallStreamUrl('https://py.example/api/v1/rag/stream')).toBe(
      'https://py.example/api/v1/rag/stream',
    );
  });
});
