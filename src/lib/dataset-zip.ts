import { unzipSync } from 'fflate';
import { normalizeAssetRelativePath } from './markdown-assets';
import type { VirtualFile } from './virtual-file-tree';

export interface ZipLimits {
  maxCompressedBytes: number;
  maxEntries: number;
  maxExpandedBytes: number;
  maxRatio: number;
  maxDepth: number;
}

const DEFAULT_LIMITS: ZipLimits = {
  maxCompressedBytes: 100 * 1024 * 1024,
  maxEntries: 5_000,
  maxExpandedBytes: 500 * 1024 * 1024,
  maxRatio: 100,
  maxDepth: 20,
};

interface CentralEntry {
  path: string;
  compressedSize: number;
  expandedSize: number;
  directory: boolean;
}

export async function extractDatasetZip(file: File, limits: ZipLimits = DEFAULT_LIMITS): Promise<VirtualFile[]> {
  if (file.size > limits.maxCompressedBytes) throw new Error('ZIP 文件过大');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const entries = inspectCentralDirectory(bytes, limits);
  const extracted = unzipSync(bytes);
  const commonRoot = getCommonRoot(entries.filter((entry) => !entry.directory).map((entry) => entry.path));
  const result: VirtualFile[] = [];
  for (const entry of entries) {
    if (entry.directory || isMetadataPath(entry.path)) continue;
    const content = extracted[entry.path];
    if (!content || content.byteLength !== entry.expandedSize) throw new Error('ZIP 解压结果不完整');
    const path = commonRoot ? entry.path.slice(commonRoot.length + 1) : entry.path;
    const name = path.split('/').pop() ?? path;
    result.push({ file: new File([content], name, { type: contentType(name) }), path });
  }
  return result;
}

export function inspectCentralDirectory(bytes: Uint8Array, limits: ZipLimits = DEFAULT_LIMITS) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEndOfCentralDirectory(view);
  const entryCount = view.getUint16(eocd + 10, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new Error('暂不支持 ZIP64');
  }
  if (entryCount > limits.maxEntries) throw new Error('ZIP 文件数量超限');
  if (centralOffset + centralSize > eocd) throw new Error('ZIP 中央目录损坏');

  const decoder = new TextDecoder('utf-8', { fatal: true });
  const paths = new Set<string>();
  const entries: CentralEntry[] = [];
  let expandedTotal = 0;
  let offset = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error('ZIP 中央目录损坏');
    const flags = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const expandedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const madeBy = view.getUint16(offset + 4, true) >> 8;
    const externalAttributes = view.getUint32(offset + 38, true);
    if (flags & 1) throw new Error('不支持加密 ZIP');
    if (madeBy === 3 && ((externalAttributes >>> 16) & 0xf000) === 0xa000) {
      throw new Error('ZIP 中不能包含符号链接');
    }
    const rawName = bytes.subarray(offset + 46, offset + 46 + nameLength);
    const decoded = decoder.decode(rawName).replace(/\\/g, '/').normalize('NFC');
    const directory = decoded.endsWith('/');
    const trimmed = directory ? decoded.slice(0, -1) : decoded;
    if (/^(?:\/|[a-z]:\/)/i.test(trimmed)) throw new Error('ZIP 中存在绝对路径');
    const path = normalizeAssetRelativePath(trimmed);
    if (!path) throw new Error('ZIP 中存在越界或非法路径');
    if (path.split('/').length > limits.maxDepth) throw new Error('ZIP 目录层级超限');
    if (paths.has(path)) throw new Error(`ZIP 路径冲突：${path}`);
    paths.add(path);
    expandedTotal += expandedSize;
    if (expandedTotal > limits.maxExpandedBytes) throw new Error('ZIP 解压大小超限');
    if (expandedSize > 0 && compressedSize === 0) throw new Error('ZIP 压缩比异常');
    if (compressedSize > 0 && expandedSize / compressedSize > limits.maxRatio) {
      throw new Error('ZIP 压缩比超限');
    }
    entries.push({ path, compressedSize, expandedSize, directory });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function findEndOfCentralDirectory(view: DataView) {
  const lowerBound = Math.max(0, view.byteLength - 65_557);
  for (let offset = view.byteLength - 22; offset >= lowerBound; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  throw new Error('不是有效的 ZIP 文件');
}

function getCommonRoot(paths: string[]) {
  if (paths.length === 0) return '';
  const first = paths[0].split('/');
  if (first.length < 2) return '';
  const root = first[0];
  return paths.every((path) => path.startsWith(`${root}/`)) ? root : '';
}

function isMetadataPath(path: string) {
  return path.startsWith('__MACOSX/') || path.split('/').some((part) => part === '.DS_Store');
}

function contentType(name: string) {
  const suffix = name.split('.').pop()?.toLowerCase();
  const values: Record<string, string> = {
    bmp: 'image/bmp',
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    md: 'text/markdown',
    markdown: 'text/markdown',
    png: 'image/png',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    webp: 'image/webp',
    html: 'text/html',
  };
  return (suffix && values[suffix]) || 'application/octet-stream';
}
