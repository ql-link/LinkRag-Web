import { getKnowledgeFileSuffix } from './knowledge-file';

export const MARKDOWN_IMAGE_SUFFIXES = new Set(['bmp', 'gif', 'jpeg', 'jpg', 'png', 'tif', 'tiff', 'webp']);

export type MarkdownAssetMatchMode = 'FULL_PATH' | 'SHALLOW_BASENAME';
export type MarkdownImageSyntax = 'MARKDOWN' | 'MARKDOWN_REFERENCE' | 'HTML' | 'OBSIDIAN';

export interface MarkdownAssetFile {
  file: File;
  relativePath: string;
}

export interface MarkdownImageReference {
  target: string;
  syntax: MarkdownImageSyntax;
}

export function isMarkdownKnowledgeFile(file: File) {
  const suffix = getKnowledgeFileSuffix(file.name);
  return suffix === 'md' || suffix === 'markdown';
}

function decodeHtml(value: string) {
  const element = document.createElement('textarea');
  element.innerHTML = value;
  return element.value;
}

function unescapeMarkdown(value: string) {
  return value.replace(/\\(.)/g, '$1');
}

function getMarkdownLinkDestination(value: string) {
  let target = value.trim();
  if (!target) return '';
  if (target.startsWith('<')) {
    const endIndex = target.indexOf('>');
    return endIndex > 0 ? unescapeMarkdown(target.slice(1, endIndex)) : '';
  }
  target = target.replace(/\s+(?:"[^"]*"|'[^']*'|\([^()]*\))\s*$/, '');
  return unescapeMarkdown(target);
}

function localTargetOrNull(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized.startsWith('#') || normalized.startsWith('//')) return null;
  if (/^(?:https?|data):/i.test(normalized)) return null;
  if (/^(?:file:|\/|\\\\|[a-z]:[\\/])/i.test(normalized)) {
    throw new Error('Markdown 中不能使用本机绝对图片路径');
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(normalized)) return null;
  return normalized;
}

function parseObsidianBody(body: string) {
  const separator = body.includes('\\|') ? body.indexOf('\\|') : body.indexOf('|');
  return unescapeMarkdown(separator < 0 ? body : body.slice(0, separator)).trim();
}

function maskMarkdownCode(markdown: string) {
  const masked = markdown.split('');
  const mask = (start: number, end: number) => {
    for (let index = start; index < end; index += 1) {
      if (masked[index] !== '\n' && masked[index] !== '\r') masked[index] = ' ';
    }
  };

  let lineStart = 0;
  let openFence: { character: string; length: number } | null = null;
  while (lineStart < markdown.length) {
    const newline = markdown.indexOf('\n', lineStart);
    const lineEnd = newline < 0 ? markdown.length : newline;
    const nextLine = newline < 0 ? markdown.length : newline + 1;
    const line = markdown.slice(lineStart, lineEnd);
    const fence = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (openFence) {
      mask(lineStart, nextLine);
      if (fence && fence[1][0] === openFence.character && fence[1].length >= openFence.length && !fence[2].trim()) {
        openFence = null;
      }
    } else if (fence) {
      openFence = { character: fence[1][0], length: fence[1].length };
      mask(lineStart, nextLine);
    }
    lineStart = nextLine;
  }

  for (let index = 0; index < markdown.length; index += 1) {
    if (masked[index] === ' ' || markdown[index] !== '`') continue;
    let openEnd = index;
    while (markdown[openEnd] === '`') openEnd += 1;
    const marker = markdown.slice(index, openEnd);
    const close = markdown.indexOf(marker, openEnd);
    if (close < 0) {
      index = openEnd - 1;
      continue;
    }
    mask(index, close + marker.length);
    index = close + marker.length - 1;
  }
  return masked.join('');
}

export function extractMarkdownImageReferences(markdown: string): MarkdownImageReference[] {
  const source = maskMarkdownCode(markdown);
  const references: MarkdownImageReference[] = [];
  const definitions = new Map<string, string>();
  for (const match of source.matchAll(/^ {0,3}\[((?:\\.|[^\]])+)]:\s*(.+)$/gm)) {
    const target = localTargetOrNull(getMarkdownLinkDestination(match[2] ?? ''));
    if (target)
      definitions.set(
        unescapeMarkdown(match[1] ?? '')
          .trim()
          .toLowerCase(),
        target,
      );
  }

  for (const match of source.matchAll(/!\[((?:\\.|[^\]])*)]\(((?:\\.|[^)])*)\)/g)) {
    const target = localTargetOrNull(getMarkdownLinkDestination(match[2] ?? ''));
    if (target) references.push({ target, syntax: 'MARKDOWN' });
  }
  for (const match of source.matchAll(/!\[((?:\\.|[^\]])*)]\[((?:\\.|[^\]])*)]/g)) {
    const label = unescapeMarkdown(match[2] || match[1] || '')
      .trim()
      .toLowerCase();
    const target = definitions.get(label);
    if (target) references.push({ target, syntax: 'MARKDOWN_REFERENCE' });
  }
  for (const match of source.matchAll(/<img\b[^>]*>/gis)) {
    const src = match[0].match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const target = localTargetOrNull(decodeHtml(src?.[1] ?? src?.[2] ?? src?.[3] ?? ''));
    if (target) references.push({ target, syntax: 'HTML' });
  }
  for (const match of source.matchAll(/!\[\[((?:\\.|[^\]])+)]]/g)) {
    const target = localTargetOrNull(parseObsidianBody(match[1] ?? ''));
    if (target) references.push({ target, syntax: 'OBSIDIAN' });
  }
  return references;
}

export function extractLocalMarkdownImageReferences(markdown: string): string[] {
  return Array.from(new Set(extractMarkdownImageReferences(markdown).map((reference) => reference.target)));
}

export function normalizeAssetRelativePath(path: string) {
  const normalized = path.replace(/\\/g, '/').trim().replace(/^\/+/, '').normalize('NFC');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  if (
    parts.some(
      (part) =>
        part === '.' ||
        part === '..' ||
        Array.from(part).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127),
    )
  ) {
    return null;
  }
  return parts.join('/');
}

export function getFolderRelativePath(file: File) {
  const webkitRelativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  const rawPath = webkitRelativePath || file.name;
  const parts = rawPath.replace(/\\/g, '/').split('/').filter(Boolean);
  if (webkitRelativePath && parts.length > 1) parts.shift();
  return normalizeAssetRelativePath(parts.join('/'));
}

export function isImageAssetFile(file: File) {
  return MARKDOWN_IMAGE_SUFFIXES.has(getKnowledgeFileSuffix(file.name));
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

export function collectShallowMarkdownAssetFiles(files: Iterable<File>) {
  const assets: MarkdownAssetFile[] = [];
  const inventoryPaths: string[] = [];
  let ignoredNestedAssetCount = 0;
  const seen = new Set<string>();
  for (const file of files) {
    const relativePath = getFolderRelativePath(file);
    if (!relativePath) continue;
    if (relativePath.includes('/')) {
      if (isImageAssetFile(file)) ignoredNestedAssetCount += 1;
      continue;
    }
    if (seen.has(relativePath)) throw new Error(`图片文件名重复：${relativePath}`);
    seen.add(relativePath);
    inventoryPaths.push(relativePath);
    if (isImageAssetFile(file)) assets.push({ file, relativePath });
  }
  return { assets, inventoryPaths, ignoredNestedAssetCount };
}

export function basenameCandidates(target: string) {
  const literal = target.replace(/\\/g, '/').split('/').pop()?.normalize('NFC') ?? '';
  const candidates = new Set<string>();
  if (literal) candidates.add(literal);
  try {
    const decoded = decodeURIComponent(literal).normalize('NFC');
    if (decoded) candidates.add(decoded);
  } catch {
    // 非法 percent encoding 只保留字面候选，与 Java 的有限候选规则一致。
  }
  return Array.from(candidates);
}
