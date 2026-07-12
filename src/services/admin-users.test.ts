import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/api-client';
import { getAdminUserDashboard } from './admin-users';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('admin user dashboard service', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
  });

  it('uses the 30 day range by default', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({});

    await getAdminUserDashboard();

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/admin/users/dashboard', { days: 30 });
  });

  it('passes a selected supported range to the backend', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({});

    await getAdminUserDashboard(90);

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/admin/users/dashboard', { days: 90 });
  });
});
