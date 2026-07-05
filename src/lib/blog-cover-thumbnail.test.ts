import { describe, expect, it } from 'vitest';
import { getBlogCoverThumbnailFilename, getConstrainedDimensions } from './blog-cover-thumbnail';

describe('getConstrainedDimensions', () => {
  it('scales wide images to the configured max width', () => {
    expect(getConstrainedDimensions({ width: 1536, height: 1024 })).toEqual({ width: 720, height: 480 });
  });

  it('keeps smaller images at their original dimensions', () => {
    expect(getConstrainedDimensions({ width: 480, height: 270 })).toEqual({ width: 480, height: 270 });
  });

  it('rejects invalid dimensions', () => {
    expect(() => getConstrainedDimensions({ width: 0, height: 270 })).toThrow('Invalid image dimensions');
  });
});

describe('getBlogCoverThumbnailFilename', () => {
  it('uses a webp filename with the thumbnail width suffix', () => {
    expect(getBlogCoverThumbnailFilename('cover.large.png')).toBe('cover.large-720w.webp');
  });
});
