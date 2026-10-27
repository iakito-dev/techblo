import { describe, expect, it, vi } from 'vitest';
import { asCompanyId, asUserId } from '@/shared/type-utils';
import type { SubscriptionRepository } from '../domain/subscription-repository';
import { listSubscriptions } from './list-subscriptions';

const company = (id: string) => ({
  id: asCompanyId(id),
  name: `Company ${id}`,
  slug: id,
  brandColor: '#000000',
  siteUrl: `https://${id}.example.com`,
});

describe('listSubscriptions', () => {
  it('企業一覧とユーザー状態を統合して返す(状態の無い企業は ON)', async () => {
    const userId = asUserId('u1');
    const repo: SubscriptionRepository = {
      listEnabledCompanies: vi.fn().mockResolvedValue([company('a'), company('b')]),
      listUserStates: vi.fn().mockResolvedValue([{ companyId: asCompanyId('b'), enabled: false }]),
      setEnabled: vi.fn(),
    };
    const result = await listSubscriptions({ subscriptions: repo })({ userId });
    expect(repo.listUserStates).toHaveBeenCalledWith(userId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((s) => [s.slug, s.enabled])).toEqual([
      ['a', true],
      ['b', false],
    ]);
  });
});
