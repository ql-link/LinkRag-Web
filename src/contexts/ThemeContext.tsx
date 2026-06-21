import { createContext, useContext, useEffect, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  darkMode: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// Dark mode is intentionally disabled while the warm editorial light theme is
// rebuilt. The context API is kept so existing `useTheme()` callers (which read
// `darkMode` and resolve to their light branch) keep working unchanged.
const LIGHT_VALUE: ThemeContextValue = {
  theme: 'light',
  darkMode: false,
  toggleTheme: () => {},
  setTheme: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(LIGHT_VALUE);

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);

  return <ThemeContext.Provider value={LIGHT_VALUE}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeContext);
}
