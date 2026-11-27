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

  it('DB の照合順序に依らず、大文字小文字を区別しない企業名順に並べる', async () => {
    const named = (id: string, name: string) => ({ ...company(id), name });
    // C 照合の ORDER BY name が返す順(大文字始まり → 小文字始まり → かな)
    const repo: SubscriptionRepository = {
      listEnabledCompanies: vi
        .fn()
        .mockResolvedValue([
          named('aws', 'AWS Japan'),
          named('anthropic', 'Anthropic Engineering'),
          named('zozo', 'ZOZO'),
          named('mercari', 'mercari'),
          named('loglass', 'ログラス'),
        ]),
      listUserStates: vi.fn().mockResolvedValue([]),
      setEnabled: vi.fn(),
    };
    const result = await listSubscriptions({ subscriptions: repo })({ userId: asUserId('u1') });
    expect(result.ok && result.value.map((s) => s.slug)).toEqual([
      'anthropic',
      'aws',
      'mercari',
      'zozo',
      'loglass',
    ]);
  });
});
