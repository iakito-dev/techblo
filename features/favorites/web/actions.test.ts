import { beforeEach, describe, expect, it, vi } from 'vitest';
import { err, ok } from '@/shared/result';

const h = vi.hoisted(() => ({
  getSession: vi.fn(),
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
  set: vi.fn(),
  merge: vi.fn(),
}));

vi.mock('next/cache', () => ({ updateTag: h.updateTag, revalidatePath: h.revalidatePath }));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/db/client', () => ({ db: {} }));
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: h.getSession } } }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../infrastructure/drizzle-favorite-repository', () => ({
  DrizzleFavoriteRepository: class {},
}));
vi.mock('../application/set-favorite', () => ({ setFavorite: () => h.set }));
vi.mock('../application/merge-guest-favorites', () => ({ mergeGuestFavorites: () => h.merge }));

const { migrateGuestFavorites, setFavoriteAction } = await import('./actions');

beforeEach(() => {
  vi.resetAllMocks();
  h.getSession.mockResolvedValue({ user: { id: 'u1' } });
});

describe('setFavoriteAction', () => {
  it('未ログインなら UNAUTHORIZED を返し、保存処理もキャッシュ無効化も行わない', async () => {
    h.getSession.mockResolvedValue(null);

    expect(await setFavoriteAction({ articleId: 'a1', favorited: true })).toEqual(
      err({ kind: 'UNAUTHORIZED' }),
    );
    expect(h.set).not.toHaveBeenCalled();
    expect(h.updateTag).not.toHaveBeenCalled();
  });

  it('成功したらユーザー単位のタグと /favorites だけを無効化する', async () => {
    h.set.mockResolvedValue(ok({ favorited: true }));

    expect(await setFavoriteAction({ articleId: 'a1', favorited: true })).toEqual(
      ok({ favorited: true }),
    );
    expect(h.set).toHaveBeenCalledWith({ userId: 'u1', articleId: 'a1', favorited: true });
    expect(h.updateTag).toHaveBeenCalledWith('user-favorites-u1');
    expect(h.revalidatePath).toHaveBeenCalledWith('/favorites');
  });

  it('保存に失敗したらエラーをそのまま返し、キャッシュは無効化しない', async () => {
    const failure = err({ kind: 'INTERNAL' as const });
    h.set.mockResolvedValue(failure);

    expect(await setFavoriteAction({ articleId: 'a1', favorited: false })).toBe(failure);
    expect(h.updateTag).not.toHaveBeenCalled();
  });
});

describe('migrateGuestFavorites', () => {
  it('未ログインなら UNAUTHORIZED を返す', async () => {
    h.getSession.mockResolvedValue(null);

    expect(await migrateGuestFavorites(['a1'])).toEqual(err({ kind: 'UNAUTHORIZED' }));
  });

  it('ID が空ならマージせず merged: 0 を返す', async () => {
    expect(await migrateGuestFavorites([])).toEqual(ok({ merged: 0 }));
    expect(h.merge).not.toHaveBeenCalled();
    expect(h.updateTag).not.toHaveBeenCalled();
  });

  it('マージ成功後にユーザー単位のタグと /favorites を無効化する', async () => {
    h.merge.mockResolvedValue(ok({ merged: 2 }));

    expect(await migrateGuestFavorites(['a1', 'a2'])).toEqual(ok({ merged: 2 }));
    expect(h.merge).toHaveBeenCalledWith({ userId: 'u1', articleIds: ['a1', 'a2'] });
    expect(h.updateTag).toHaveBeenCalledWith('user-favorites-u1');
    expect(h.revalidatePath).toHaveBeenCalledWith('/favorites');
  });
});
