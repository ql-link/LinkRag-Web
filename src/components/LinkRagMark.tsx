export function LinkRagMark({ darkMode }: { darkMode?: boolean }) {
  return (
    <img
      src="/linkrag-mark-v2.png"
      alt="LinkRag"
      className="h-full w-full object-contain"
      style={darkMode ? { filter: 'saturate(0.96) brightness(0.96)' } : undefined}
    />
  );
}
