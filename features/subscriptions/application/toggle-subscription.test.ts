import { describe, expect, it, vi } from 'vitest';
import { asCompanyId, asUserId } from '@/shared/type-utils';
import type { SubscriptionRepository } from '../domain/subscription-repository';
import { toggleSubscription } from './toggle-subscription';

function fakeRepo(): SubscriptionRepository {
  return { listEnabledCompanies: vi.fn(), listUserStates: vi.fn(), setEnabled: vi.fn() };
}

describe('toggleSubscription', () => {
  const userId = asUserId('u1');
  const companyId = asCompanyId('c1');

  it.each([true, false])('enabled=%s をそのまま setEnabled に渡して返す', async (enabled) => {
    const repo = fakeRepo();
    const result = await toggleSubscription({ subscriptions: repo })({
      userId,
      companyId,
      enabled,
    });
    expect(repo.setEnabled).toHaveBeenCalledExactlyOnceWith(userId, companyId, enabled);
    expect(result).toEqual({ ok: true, value: { enabled } });
  });
});
