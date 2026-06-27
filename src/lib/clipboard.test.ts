import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyTextToClipboard } from './clipboard';

const originalClipboard = navigator.clipboard;
const originalExecCommand = document.execCommand;

function setClipboard(value: Partial<Clipboard> | undefined) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value,
  });
}

function setExecCommand(result: boolean) {
  const execCommand = vi.fn(() => result);

  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    value: execCommand,
  });

  return execCommand;
}

describe('copyTextToClipboard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setClipboard(originalClipboard);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: originalExecCommand,
    });
  });

  it('uses navigator.clipboard.writeText when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const execCommand = setExecCommand(true);
    setClipboard({ writeText });

    await copyTextToClipboard('hello');

    expect(writeText).toHaveBeenCalledWith('hello');
    expect(execCommand).not.toHaveBeenCalled();
  });

  it('falls back to legacy copy when Clipboard API is unavailable', async () => {
    const execCommand = setExecCommand(true);
    setClipboard(undefined);

    await copyTextToClipboard('fallback text');

    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('falls back when navigator.clipboard.writeText rejects', async () => {
    const writeText = vi.fn().mockRejectedValue(new DOMException('Not allowed', 'NotAllowedError'));
    const execCommand = setExecCommand(true);
    setClipboard({ writeText });

    await copyTextToClipboard('retry text');

    expect(writeText).toHaveBeenCalledWith('retry text');
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('rejects when no copy strategy succeeds', async () => {
    setClipboard(undefined);
    setExecCommand(false);

    await expect(copyTextToClipboard('nope')).rejects.toThrow('Legacy clipboard copy failed.');
  });
});
