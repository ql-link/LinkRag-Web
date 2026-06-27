import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  darkMode: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const LIGHT_VALUE: ThemeContextValue = {
  theme: 'light',
  darkMode: false,
  toggleTheme: () => {},
  setTheme: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(LIGHT_VALUE);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mountedRef = useRef(false);
  const transitionTimeoutRef = useRef<number | null>(null);
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  });

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (mountedRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.add('theme-transition');
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
      transitionTimeoutRef.current = window.setTimeout(() => {
        root.classList.remove('theme-transition');
        transitionTimeoutRef.current = null;
      }, 360);
    }

    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
    mountedRef.current = true;

    return () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
      root.classList.remove('theme-transition');
    };
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      darkMode: theme === 'dark',
      toggleTheme: () => setThemeState((current) => (current === 'dark' ? 'light' : 'dark')),
      setTheme: setThemeState,
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  return useContext(ThemeContext);
}
