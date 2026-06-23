import { useEffect, useState } from 'react';

/**
 * 订阅一个媒体查询，返回当前是否匹配。SSR/无 window 时回退为 false。
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/** 桌面断点：与 Tailwind `lg`(1024px) 对齐，亦即移动端外壳（汉堡+底部导航）切换为桌面侧边栏的临界点。 */
export const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

/** 当前视口是否为桌面（≥1024px）。用于「仅桌面」页面的守卫与入口隐藏。 */
export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_MEDIA_QUERY);
}
