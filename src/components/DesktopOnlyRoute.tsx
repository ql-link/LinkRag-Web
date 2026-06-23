import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { Routes as RoutePaths } from '@/routes';
import { useIsDesktop } from '@/hooks/useMediaQuery';

/**
 * 「仅桌面」路由守卫：在移动端（<1024px）直接重定向到首页，不渲染受保护页面。
 * 用于后台管理、模型管理、博客编辑器等难以在窄屏适配的桌面专用页面。
 */
export function DesktopOnlyRoute({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop();
  if (!isDesktop) return <Navigate to={RoutePaths.Home} replace />;
  return <>{children}</>;
}
