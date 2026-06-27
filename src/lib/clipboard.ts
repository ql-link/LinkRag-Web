function restoreSelection(range: Range | null) {
  if (!range) return;

  const selection = document.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function legacyCopyText(text: string) {
  if (typeof document === 'undefined' || !document.body || typeof document.execCommand !== 'function') {
    throw new Error('Clipboard copy is unavailable.');
  }

  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const selection = document.getSelection();
  const selectedRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const textarea = document.createElement('textarea');

  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';

  document.body.appendChild(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    const copied = document.execCommand('copy');
    if (!copied) throw new Error('Legacy clipboard copy failed.');
  } finally {
    textarea.remove();
    restoreSelection(selectedRange);
    activeElement?.focus({ preventScroll: true });
  }
}

export async function copyTextToClipboard(text: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      legacyCopyText(text);
      return;
    }
  }

  legacyCopyText(text);
}
