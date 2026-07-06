import { getKnowledgeFileSuffix } from './knowledge-file';

const IMAGE_ASSET_SUFFIXES = new Set(['apng', 'avif', 'bmp', 'gif', 'ico', 'jpeg', 'jpg', 'png', 'svg', 'webp']);

export interface MarkdownAssetFile {
  file: File;
  relativePath: string;
}

export function isMarkdownKnowledgeFile(file: File) {
  const suffix = getKnowledgeFileSuffix(file.name);
  return suffix === 'md' || suffix === 'markdown';
}

function getMarkdownLinkDestination(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('<')) {
    const endIndex = trimmed.indexOf('>');
    return endIndex > 0 ? trimmed.slice(1, endIndex).trim() : '';
  }

  const whitespaceIndex = trimmed.search(/\s/);
  return whitespaceIndex > 0 ? trimmed.slice(0, whitespaceIndex).trim() : trimmed;
}

function isLocalMarkdownImageReference(value: string) {
  const normalized = value.trim();
  if (!normalized) return false;
  if (normalized.startsWith('#')) return false;
  if (normalized.startsWith('//')) return false;
  if (/^(?:https?|data|file):/i.test(normalized)) return false;
  return !/^[a-z][a-z0-9+.-]*:/i.test(normalized);
}

export function extractLocalMarkdownImageReferences(markdown: string): string[] {
  const references = new Set<string>();

  const markdownImagePattern = /!\[[^\]]*]\(([^)]*)\)/g;
  for (const match of markdown.matchAll(markdownImagePattern)) {
    const destination = getMarkdownLinkDestination(match[1] ?? '');
    if (isLocalMarkdownImageReference(destination)) {
      references.add(destination);
    }
  }

  const htmlImagePattern = /<img\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  for (const match of markdown.matchAll(htmlImagePattern)) {
    const destination = (match[1] ?? match[2] ?? match[3] ?? '').trim();
    if (isLocalMarkdownImageReference(destination)) {
      references.add(destination);
    }
  }

  return Array.from(references);
}

export function normalizeAssetRelativePath(path: string) {
  const normalized = path.replace(/\\/g, '/').trim().replace(/^\/+/, '');
  const parts = normalized.split('/').filter(Boolean);

  if (parts.length === 0) return null;
  if (parts.some((part) => part === '.' || part === '..')) return null;

  return parts.join('/');
}

function getFolderRelativePath(file: File) {
  const webkitRelativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  const rawPath = webkitRelativePath || file.name;
  const parts = rawPath.replace(/\\/g, '/').split('/').filter(Boolean);

  if (webkitRelativePath && parts.length > 1) {
    parts.shift();
  }

  return normalizeAssetRelativePath(parts.join('/'));
}

function isImageAssetFile(file: File) {
  return file.type.startsWith('image/') || IMAGE_ASSET_SUFFIXES.has(getKnowledgeFileSuffix(file.name));
}

export function collectMarkdownAssetFiles(files: Iterable<File>): MarkdownAssetFile[] {
  const assets: MarkdownAssetFile[] = [];
  const seenRelativePaths = new Set<string>();

  for (const file of files) {
    if (!isImageAssetFile(file)) continue;

    const relativePath = getFolderRelativePath(file);
    if (!relativePath || seenRelativePaths.has(relativePath)) continue;

    seenRelativePaths.add(relativePath);
    assets.push({ file, relativePath });
  }

  return assets;
}
