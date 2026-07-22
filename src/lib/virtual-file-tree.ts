import { getKnowledgeFileSuffix, isSupportedKnowledgeFile } from './knowledge-file';
import {
  MARKDOWN_IMAGE_SUFFIXES,
  basenameCandidates,
  extractMarkdownImageReferences,
  normalizeAssetRelativePath,
  type MarkdownAssetFile,
  type MarkdownAssetMatchMode,
} from './markdown-assets';

export interface VirtualFile {
  file: File;
  path: string;
}

export interface MarkdownDocumentPackage {
  file: File;
  documentPath?: string;
  matchMode?: MarkdownAssetMatchMode;
  assets: MarkdownAssetFile[];
  inventoryPaths: string[];
  localReferenceCount: number;
}

export function virtualFilesFromFolder(files: Iterable<File>): VirtualFile[] {
  const result: VirtualFile[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const webkitPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
    const parts = (webkitPath || file.name).replace(/\\/g, '/').split('/').filter(Boolean);
    if (webkitPath && parts.length > 1) parts.shift();
    const path = normalizeAssetRelativePath(parts.join('/'));
    if (!path) throw new Error('文件夹中存在非法路径');
    if (seen.has(path)) throw new Error(`文件路径冲突：${path}`);
    seen.add(path);
    result.push({ file, path });
  }
  return result;
}

export function listKnowledgeDocuments(tree: VirtualFile[]) {
  return tree.filter((entry) => isSupportedKnowledgeFile(entry.file));
}

export async function buildDocumentPackage(
  document: VirtualFile,
  tree: VirtualFile[],
): Promise<MarkdownDocumentPackage> {
  const suffix = getKnowledgeFileSuffix(document.file.name);
  if (suffix !== 'md' && suffix !== 'markdown') {
    return { file: document.file, assets: [], inventoryPaths: [], localReferenceCount: 0 };
  }

  const references = extractMarkdownImageReferences(await document.file.text());
  const inventory = new Set(tree.map((entry) => entry.path));
  const byPath = new Map(tree.map((entry) => [entry.path, entry.file]));
  const selected = new Map<string, MarkdownAssetFile>();

  for (const reference of references) {
    const candidates = resolveFullPathCandidates(reference.target, reference.syntax, document.path, inventory);
    const existing = candidates.filter((candidate) => inventory.has(candidate));
    if (new Set(existing).size !== 1) continue;
    const relativePath = existing[0];
    const file = byPath.get(relativePath);
    if (!file || !MARKDOWN_IMAGE_SUFFIXES.has(getKnowledgeFileSuffix(file.name))) continue;
    selected.set(relativePath, { file, relativePath });
  }

  return {
    file: document.file,
    documentPath: document.path,
    matchMode: 'FULL_PATH',
    assets: Array.from(selected.values()),
    inventoryPaths: Array.from(inventory),
    localReferenceCount: references.length,
  };
}

function resolveFullPathCandidates(target: string, syntax: string, documentPath: string, inventory: Set<string>) {
  const targetVariants = targetCandidates(target);
  const parent = documentPath.includes('/') ? documentPath.slice(0, documentPath.lastIndexOf('/')) : '';
  const candidates = new Set<string>();
  for (const variant of targetVariants) {
    const relative = resolveFrom(parent, variant);
    if (relative) candidates.add(relative);
    if (syntax === 'OBSIDIAN') {
      const root = resolveFrom('', variant);
      if (root) candidates.add(root);
    }
  }
  if (syntax === 'OBSIDIAN' && targetVariants.every((variant) => !variant.includes('/'))) {
    const names = new Set(targetVariants.map((variant) => variant.split('/').pop()));
    inventory.forEach((path) => {
      if (names.has(path.split('/').pop())) candidates.add(path);
    });
  }
  return Array.from(candidates);
}

function targetCandidates(target: string) {
  const literal = target.replace(/\\/g, '/').normalize('NFC');
  const candidates = new Set([literal]);
  try {
    candidates.add(decodeURIComponent(literal).normalize('NFC'));
  } catch {
    // 保留字面候选。
  }
  return Array.from(candidates);
}

function resolveFrom(parent: string, target: string) {
  const parts = parent ? parent.split('/') : [];
  for (const part of target.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (parts.length === 0) return null;
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return normalizeAssetRelativePath(parts.join('/'));
}

export function buildShallowDocumentPackage(
  file: File,
  assets: MarkdownAssetFile[],
  inventoryPaths: string[],
  references: string[],
): MarkdownDocumentPackage {
  const inventory = new Set(inventoryPaths);
  const byPath = new Map(assets.map((asset) => [asset.relativePath, asset]));
  const selected = new Map<string, MarkdownAssetFile>();
  references.forEach((target) => {
    const existing = basenameCandidates(target).filter((candidate) => inventory.has(candidate));
    if (new Set(existing).size === 1) {
      const asset = byPath.get(existing[0]);
      if (asset) selected.set(asset.relativePath, asset);
    }
  });
  return {
    file,
    documentPath: file.name,
    matchMode: 'SHALLOW_BASENAME',
    assets: Array.from(selected.values()),
    inventoryPaths,
    localReferenceCount: references.length,
  };
}
