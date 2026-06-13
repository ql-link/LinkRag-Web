export const KNOWLEDGE_FILE_SUFFIXES = ['md', 'markdown', 'pdf', 'docx'] as const;

export const KNOWLEDGE_FILE_ACCEPT = KNOWLEDGE_FILE_SUFFIXES.map((suffix) => `.${suffix}`).join(',');
export const KNOWLEDGE_FILE_HINT = `支持 ${KNOWLEDGE_FILE_SUFFIXES.join(' / ')}`;
export const KNOWLEDGE_FILE_UNSUPPORTED_MESSAGE = `当前仅支持上传 ${KNOWLEDGE_FILE_SUFFIXES.join(' / ')} 文件`;

export function getKnowledgeFileSuffix(filename: string): string {
  const normalized = filename.trim();
  const dotIndex = normalized.lastIndexOf('.');
  if (dotIndex < 0 || dotIndex === normalized.length - 1) {
    return '';
  }
  return normalized.substring(dotIndex + 1).toLowerCase();
}

export function isSupportedKnowledgeFile(file: File): boolean {
  return KNOWLEDGE_FILE_SUFFIXES.includes(
    getKnowledgeFileSuffix(file.name) as (typeof KNOWLEDGE_FILE_SUFFIXES)[number],
  );
}
