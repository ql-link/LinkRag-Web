import { describe, expect, it } from 'vitest';
import { formatAdminDashboardDate } from './formatters';

describe('admin user dashboard date formatting', () => {
  it('keeps the backend date in the Asia Shanghai calendar day', () => {
    expect(formatAdminDashboardDate('2026-07-11')).toBe('07/11');
  });

  it('does not shift the first day of a month to the previous day', () => {
    expect(formatAdminDashboardDate('2026-08-01')).toBe('08/01');
  });
});
