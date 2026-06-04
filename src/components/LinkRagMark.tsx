import { useTheme } from '@/contexts/ThemeContext';

const darkModeLogoStyle = {
  filter: 'saturate(1.05) brightness(1.55) contrast(0.95) drop-shadow(0 0 1px rgba(255,255,255,0.45))',
};

export function LinkRagMark({ darkMode: darkModeProp }: { darkMode?: boolean }) {
  const { darkMode: darkModeCtx } = useTheme();
  const darkMode = darkModeProp ?? darkModeCtx;

  return (
    <img
      src="/linkrag-mark-v2.png"
      alt="LinkRag"
      className="h-full w-full object-contain"
      style={darkMode ? darkModeLogoStyle : undefined}
    />
  );
}
