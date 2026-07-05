export const BLOG_COVER_THUMBNAIL_MAX_WIDTH = 720;
export const BLOG_COVER_THUMBNAIL_QUALITY = 0.82;
export const BLOG_COVER_THUMBNAIL_TYPE = 'image/webp';

export interface ImageDimensions {
  width: number;
  height: number;
}

export function getConstrainedDimensions(
  dimensions: ImageDimensions,
  maxWidth = BLOG_COVER_THUMBNAIL_MAX_WIDTH,
): ImageDimensions {
  const { width, height } = dimensions;
  if (width <= 0 || height <= 0) {
    throw new Error('Invalid image dimensions');
  }

  if (width <= maxWidth) {
    return { width, height };
  }

  return {
    width: maxWidth,
    height: Math.round((height * maxWidth) / width),
  };
}

export function getBlogCoverThumbnailFilename(filename: string): string {
  const basename = filename.replace(/\.[^.]*$/, '') || 'cover';
  return `${basename}-${BLOG_COVER_THUMBNAIL_MAX_WIDTH}w.webp`;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load cover image'));
    };

    image.decoding = 'async';
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate cover thumbnail'));
        }
      },
      BLOG_COVER_THUMBNAIL_TYPE,
      BLOG_COVER_THUMBNAIL_QUALITY,
    );
  });
}

export async function createBlogCoverThumbnail(file: File): Promise<File> {
  const image = await loadImage(file);
  const { width, height } = getConstrainedDimensions({
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not available');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToBlob(canvas);
  return new File([blob], getBlogCoverThumbnailFilename(file.name), {
    type: BLOG_COVER_THUMBNAIL_TYPE,
    lastModified: Date.now(),
  });
}
