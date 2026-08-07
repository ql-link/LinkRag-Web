import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { UserProfileDTO } from '@/types/api';
import { getProfile } from '@/services/user';
import { clearToken, isLoggedIn, logout as apiLogout } from '@/services/auth';

interface AdminAuthContextType {
  admin: UserProfileDTO | null;
  loading: boolean;
  refreshAdmin: () => Promise<UserProfileDTO>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  admin: null,
  loading: true,
  refreshAdmin: async () => {
    throw new Error('AdminAuthProvider is missing');
  },
  logout: async () => {},
});

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<UserProfileDTO | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshAdmin() {
    const profile = await getProfile('admin');
    if (profile.role !== 'ADMIN') {
      clearToken('admin');
      setAdmin(null);
      throw new Error('当前账号没有管理权限');
    }
    setAdmin(profile);
    return profile;
  }

  useEffect(() => {
    if (!isLoggedIn('admin')) {
      setLoading(false);
      return;
    }
    refreshAdmin()
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    try {
      await apiLogout('admin');
    } catch {
      // 服务端退出失败时仍清理本地管理凭证。
    }
    clearToken('admin');
    setAdmin(null);
  }

  return (
    <AdminAuthContext.Provider value={{ admin, loading, refreshAdmin, logout }}>{children}</AdminAuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
