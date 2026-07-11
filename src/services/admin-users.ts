import { apiClient } from '@/lib/api-client';
import type { AdminUserDashboardDTO } from '@/types/api';

export type AdminUserDashboardRange = 7 | 30 | 90;

export function getAdminUserDashboard(days: AdminUserDashboardRange = 30): Promise<AdminUserDashboardDTO> {
  return apiClient.get<AdminUserDashboardDTO>('/api/v1/admin/users/dashboard', { days });
}
