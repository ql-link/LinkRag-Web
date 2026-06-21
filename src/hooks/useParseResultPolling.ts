import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { getParseResults, mergeKnowledgeFilesWithParseResults } from '@/services/dataset';
import type { KnowledgeFileDTO } from '@/types/api';

const DEFAULT_PARSE_POLL_INTERVAL_MS = 2500;

interface UseParseResultPollingOptions<TFile extends KnowledgeFileDTO> {
  datasetId: number | null | undefined;
  files: TFile[];
  setFiles: Dispatch<SetStateAction<TFile[]>>;
  intervalMs?: number;
}

function normalizeFileIds(fileIds: number | number[]) {
  const ids = Array.isArray(fileIds) ? fileIds : [fileIds];
  return Array.from(new Set(ids.filter((id) => Number.isFinite(id)))).sort((a, b) => a - b);
}

function areNumberArraysEqual(left: number[], right: number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function useParseResultPolling<TFile extends KnowledgeFileDTO>({
  datasetId,
  files,
  setFiles,
  intervalMs = DEFAULT_PARSE_POLL_INTERVAL_MS,
}: UseParseResultPollingOptions<TFile>) {
  const [pollingFileIds, setPollingFileIds] = useState<number[]>([]);

  const addPollingFiles = useCallback((fileIds: number | number[]) => {
    const incomingIds = normalizeFileIds(fileIds);
    if (incomingIds.length === 0) return;

    setPollingFileIds((prev) => {
      const next = normalizeFileIds([...prev, ...incomingIds]);
      return areNumberArraysEqual(prev, next) ? prev : next;
    });
  }, []);

  const removePollingFiles = useCallback((fileIds: number | number[]) => {
    const idsToRemove = new Set(normalizeFileIds(fileIds));
    if (idsToRemove.size === 0) return;

    setPollingFileIds((prev) => {
      const next = prev.filter((fileId) => !idsToRemove.has(fileId));
      return areNumberArraysEqual(prev, next) ? prev : next;
    });
  }, []);

  useEffect(() => {
    const parsingFileIds = normalizeFileIds(
      files.filter((file) => file.frontendStatus === 'parsing').map((file) => file.id),
    );

    setPollingFileIds((prev) => (areNumberArraysEqual(prev, parsingFileIds) ? prev : parsingFileIds));
  }, [files]);

  useEffect(() => {
    if (!datasetId || pollingFileIds.length === 0) return;

    const activeDatasetId = datasetId;
    let cancelled = false;
    let timeoutId: number | undefined;
    const currentFileIds = [...pollingFileIds];

    async function pollParseResults() {
      try {
        const results = await getParseResults(activeDatasetId, currentFileIds);
        if (cancelled) return;

        setFiles((prev) => mergeKnowledgeFilesWithParseResults(prev, results));

        const resultMap = new Map(results.map((result) => [result.fileId, result]));
        const stillParsingIds = new Set(
          currentFileIds.filter((fileId) => resultMap.get(fileId)?.frontendStatus === 'parsing'),
        );
        const polledIds = new Set(currentFileIds);

        setPollingFileIds((prev) => {
          const next = prev.filter((fileId) => !polledIds.has(fileId) || stillParsingIds.has(fileId));
          return areNumberArraysEqual(prev, next) ? prev : next;
        });
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to poll parse results:', error);
        }
      } finally {
        if (!cancelled) {
          timeoutId = window.setTimeout(() => {
            void pollParseResults();
          }, intervalMs);
        }
      }
    }

    void pollParseResults();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [datasetId, intervalMs, pollingFileIds, setFiles]);

  return {
    pollingFileIds,
    addPollingFiles,
    removePollingFiles,
  };
}
