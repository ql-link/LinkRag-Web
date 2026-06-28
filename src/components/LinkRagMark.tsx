import { useTheme } from '@/contexts/ThemeContext';

export function LinkRagMark({ darkMode: darkModeProp }: { darkMode?: boolean }) {
  const { darkMode: darkModeCtx } = useTheme();
  const darkMode = darkModeProp ?? darkModeCtx;

  return (
    <img
      src={darkMode ? '/linkrag-mark-v2-dark.png' : '/linkrag-mark-v2.png'}
      alt="LinkRag"
      className="h-full w-full object-contain"
    />
  );
}
