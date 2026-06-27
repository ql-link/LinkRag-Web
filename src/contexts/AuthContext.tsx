import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserProfileDTO } from '@/types/api';
import { getProfile } from '@/services/user';
import { clearToken, isLoggedIn, logout as apiLogout } from '@/services/auth';

interface AuthContextType {
  user: UserProfileDTO | null;
  loading: boolean;
  setUser: (user: UserProfileDTO | null) => void;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  refreshProfile: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfileDTO | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshProfile() {
    if (!isLoggedIn()) {
      setUser(null);
      return;
    }

    try {
      const profile = await getProfile();
      setUser(profile);
    } catch (error) {
      clearToken();
      setUser(null);
      throw error;
    }
  }

  useEffect(() => {
    if (isLoggedIn()) {
      refreshProfile()
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // 即使后端调用失败，也清除本地状态
    }
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refreshProfile, logout }}>{children}</AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
