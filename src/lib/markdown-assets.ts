import { getKnowledgeFileSuffix } from './knowledge-file';

const IMAGE_ASSET_SUFFIXES = new Set(['apng', 'avif', 'bmp', 'gif', 'ico', 'jpeg', 'jpg', 'png', 'svg', 'webp']);

export interface MarkdownAssetFile {
  file: File;
  relativePath: string;
}

interface BrowserFileHandle {
  getFile: () => Promise<File>;
}

interface BrowserDirectoryHandle {
  getDirectoryHandle: (name: string) => Promise<BrowserDirectoryHandle>;
  getFileHandle: (name: string) => Promise<BrowserFileHandle>;
}

interface DirectoryPickerWindow extends Window {
  showDirectoryPicker?: () => Promise<BrowserDirectoryHandle>;
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

export function normalizeMarkdownAssetReference(path: string) {
  const queryIndex = path.search(/[?#]/);
  const pathOnly = queryIndex >= 0 ? path.slice(0, queryIndex) : path;
  const normalized = pathOnly.replace(/\\/g, '/').trim().replace(/^\/+/, '');
  const parts = normalized.split('/').filter(Boolean);

  if (parts.length === 0) return null;
  if (parts.some((part) => part === '..')) return null;

  return parts.filter((part) => part !== '.').join('/');
}

export function canPickMarkdownAssetDirectory(win: Window = window) {
  return typeof (win as DirectoryPickerWindow).showDirectoryPicker === 'function';
}

async function getReferencedFileFromDirectory(root: BrowserDirectoryHandle, relativePath: string) {
  const parts = relativePath.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  let directory = root;
  for (const part of parts.slice(0, -1)) {
    try {
      directory = await directory.getDirectoryHandle(part);
    } catch {
      return null;
    }
  }

  try {
    return await directory.getFileHandle(parts[parts.length - 1]).then((handle) => handle.getFile());
  } catch {
    return null;
  }
}

export async function pickMarkdownAssetDirectory(
  referencedPaths: Iterable<string>,
  win: Window = window,
): Promise<MarkdownAssetFile[] | null | undefined> {
  const showDirectoryPicker = (win as DirectoryPickerWindow).showDirectoryPicker;
  if (!showDirectoryPicker) return undefined;

  let root: BrowserDirectoryHandle;
  try {
    root = await showDirectoryPicker.call(win);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null;
    }
    throw error;
  }

  const assets: MarkdownAssetFile[] = [];
  const referencedPathSet = new Set(
    Array.from(referencedPaths)
      .map((path) => normalizeMarkdownAssetReference(path))
      .filter((path): path is string => Boolean(path)),
  );

  for (const relativePath of referencedPathSet) {
    const file = await getReferencedFileFromDirectory(root, relativePath);
    if (file && isImageAssetFile(file)) {
      assets.push({ file, relativePath });
    }
  }

  return assets;
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

export function collectMarkdownAssetFiles(
  files: Iterable<File>,
  referencedPaths?: Iterable<string>,
): MarkdownAssetFile[] {
  const assets: MarkdownAssetFile[] = [];
  const seenRelativePaths = new Set<string>();
  const referencedPathSet =
    referencedPaths === undefined
      ? null
      : new Set(
          Array.from(referencedPaths)
            .map((path) => normalizeMarkdownAssetReference(path))
            .filter((path): path is string => Boolean(path)),
        );

  for (const file of files) {
    if (!isImageAssetFile(file)) continue;

    const relativePath = getFolderRelativePath(file);
    if (!relativePath || seenRelativePaths.has(relativePath)) continue;
    if (referencedPathSet && !referencedPathSet.has(relativePath)) continue;

    seenRelativePaths.add(relativePath);
    assets.push({ file, relativePath });
  }

  return assets;
}
