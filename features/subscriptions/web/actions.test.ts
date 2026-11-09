import { beforeEach, describe, expect, it, vi } from 'vitest';
import { err, ok } from '@/shared/result';

const h = vi.hoisted(() => ({
  getSession: vi.fn(),
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
  toggle: vi.fn(),
  getSettings: vi.fn(),
}));

vi.mock('next/cache', () => ({ updateTag: h.updateTag, revalidatePath: h.revalidatePath }));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/db/client', () => ({ db: {} }));
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: h.getSession } } }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../infrastructure/drizzle-subscription-repository', () => ({
  DrizzleSubscriptionRepository: class {},
}));
vi.mock('../application/toggle-subscription', () => ({ toggleSubscription: () => h.toggle }));
vi.mock('./queries', () => ({ getSubscriptionSettings: h.getSettings }));

const { migrateGuestSubscriptions, toggleSubscriptionAction } = await import('./actions');

beforeEach(() => {
  vi.resetAllMocks();
  h.getSession.mockResolvedValue({ user: { id: 'u1' } });
});

describe('toggleSubscriptionAction', () => {
  it('未ログインなら UNAUTHORIZED を返し、切り替えもキャッシュ無効化も行わない', async () => {
    h.getSession.mockResolvedValue(null);

    expect(await toggleSubscriptionAction({ companyId: 'c1', enabled: false })).toEqual(
      err({ kind: 'UNAUTHORIZED' }),
    );
    expect(h.toggle).not.toHaveBeenCalled();
    expect(h.updateTag).not.toHaveBeenCalled();
  });

  it('成功したらユーザー単位のタグと /settings を無効化する', async () => {
    h.toggle.mockResolvedValue(ok({ enabled: false }));

    expect(await toggleSubscriptionAction({ companyId: 'c1', enabled: false })).toEqual(
      ok({ enabled: false }),
    );
    expect(h.toggle).toHaveBeenCalledWith({ userId: 'u1', companyId: 'c1', enabled: false });
    expect(h.updateTag).toHaveBeenCalledWith('user-subscriptions-u1');
    expect(h.revalidatePath).toHaveBeenCalledWith('/settings');
  });

  it('失敗したらエラーをそのまま返し、キャッシュは無効化しない', async () => {
    const failure = err({ kind: 'INTERNAL' as const });
    h.toggle.mockResolvedValue(failure);

    expect(await toggleSubscriptionAction({ companyId: 'c1', enabled: true })).toBe(failure);
    expect(h.updateTag).not.toHaveBeenCalled();
  });
});

describe('migrateGuestSubscriptions', () => {
  const settings = [
    { companyId: 'c1', slug: 'mercari', enabled: true },
    { companyId: 'c2', slug: 'dena', enabled: true },
    { companyId: 'c3', slug: 'lycorp', enabled: false },
  ];

  it('OFF 指定が空なら、セッション確認も DB アクセスもしない', async () => {
    await migrateGuestSubscriptions([]);

    expect(h.getSession).not.toHaveBeenCalled();
    expect(h.toggle).not.toHaveBeenCalled();
  });

  it('未ログインなら何もしない', async () => {
    h.getSession.mockResolvedValue(null);

    await migrateGuestSubscriptions(['mercari']);

    expect(h.getSettings).not.toHaveBeenCalled();
    expect(h.toggle).not.toHaveBeenCalled();
  });

  it('指定 slug のうち、いま ON の企業だけを OFF にして無効化する(既に OFF・未指定は触らない)', async () => {
    h.getSettings.mockResolvedValue(settings);
    h.toggle.mockResolvedValue(ok({ enabled: false }));

    await migrateGuestSubscriptions(['mercari', 'lycorp', 'unknown']);

    expect(h.toggle).toHaveBeenCalledTimes(1);
    expect(h.toggle).toHaveBeenCalledWith({ userId: 'u1', companyId: 'c1', enabled: false });
    expect(h.updateTag).toHaveBeenCalledWith('user-subscriptions-u1');
    expect(h.revalidatePath).toHaveBeenCalledWith('/settings');
  });

  it('対象が無ければキャッシュも無効化しない', async () => {
    h.getSettings.mockResolvedValue(settings);

    await migrateGuestSubscriptions(['lycorp']);

    expect(h.toggle).not.toHaveBeenCalled();
    expect(h.updateTag).not.toHaveBeenCalled();
  });

  it('1 社の切り替えに失敗しても残りを続け、最後に無効化する', async () => {
    h.getSettings.mockResolvedValue(settings);
    h.toggle
      .mockResolvedValueOnce(err({ kind: 'INTERNAL' as const }))
      .mockResolvedValueOnce(ok({ enabled: false }));

    await migrateGuestSubscriptions(['mercari', 'dena']);

    expect(h.toggle).toHaveBeenCalledTimes(2);
    expect(h.updateTag).toHaveBeenCalledWith('user-subscriptions-u1');
  });
});
