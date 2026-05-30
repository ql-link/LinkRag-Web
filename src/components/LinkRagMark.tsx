import { useTheme } from '@/contexts/ThemeContext';

export function LinkRagMark({ darkMode: darkModeProp }: { darkMode?: boolean }) {
  const { darkMode: darkModeCtx } = useTheme();
  const darkMode = darkModeProp ?? darkModeCtx;

  return (
    <img
      src="/linkrag-mark-v2.png"
      alt="LinkRag"
      className="h-full w-full object-contain"
      style={darkMode ? { filter: 'saturate(0.96) brightness(0.96)' } : undefined}
    />
  );
}
