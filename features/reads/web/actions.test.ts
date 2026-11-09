import { beforeEach, describe, expect, it, vi } from 'vitest';
import { err, ok } from '@/shared/result';

const h = vi.hoisted(() => ({
  getSession: vi.fn(),
  revalidateTag: vi.fn(),
  mark: vi.fn(),
  merge: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidateTag: h.revalidateTag }));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/db/client', () => ({ db: {} }));
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: h.getSession } } }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../infrastructure/drizzle-read-repository', () => ({ DrizzleReadRepository: class {} }));
vi.mock('../application/mark-read', () => ({ markRead: () => h.mark }));
vi.mock('../application/merge-guest-reads', () => ({ mergeGuestReads: () => h.merge }));

const { markReadAction, migrateGuestReads } = await import('./actions');

beforeEach(() => {
  vi.resetAllMocks();
  h.getSession.mockResolvedValue({ user: { id: 'u1' } });
});

describe('markReadAction', () => {
  it('未ログインはエラーにせず read: false を返し、DB にもキャッシュにも触れない(ゲストは localStorage 側)', async () => {
    h.getSession.mockResolvedValue(null);

    expect(await markReadAction('a1')).toEqual(ok({ read: false }));
    expect(h.mark).not.toHaveBeenCalled();
    expect(h.revalidateTag).not.toHaveBeenCalled();
  });

  it('既読化に成功したらユーザー単位のタグを遅延無効化(max)する', async () => {
    h.mark.mockResolvedValue(ok({ read: true }));

    expect(await markReadAction('a1')).toEqual(ok({ read: true }));
    expect(h.mark).toHaveBeenCalledWith({ userId: 'u1', articleId: 'a1' });
    expect(h.revalidateTag).toHaveBeenCalledWith('user-reads-u1', 'max');
  });

  it('既読化に失敗したらエラーをそのまま返し、キャッシュは無効化しない', async () => {
    const failure = err({ kind: 'INTERNAL' as const });
    h.mark.mockResolvedValue(failure);

    expect(await markReadAction('a1')).toBe(failure);
    expect(h.revalidateTag).not.toHaveBeenCalled();
  });
});

describe('migrateGuestReads', () => {
  it('未ログインなら UNAUTHORIZED を返す', async () => {
    h.getSession.mockResolvedValue(null);

    expect(await migrateGuestReads(['a1'])).toEqual(err({ kind: 'UNAUTHORIZED' }));
    expect(h.merge).not.toHaveBeenCalled();
  });

  it('ID が空ならマージせず merged: 0 を返す', async () => {
    expect(await migrateGuestReads([])).toEqual(ok({ merged: 0 }));
    expect(h.merge).not.toHaveBeenCalled();
    expect(h.revalidateTag).not.toHaveBeenCalled();
  });

  it('マージ成功後にユーザー単位のタグを遅延無効化する', async () => {
    h.merge.mockResolvedValue(ok({ merged: 2 }));

    expect(await migrateGuestReads(['a1', 'a2'])).toEqual(ok({ merged: 2 }));
    expect(h.merge).toHaveBeenCalledWith({ userId: 'u1', articleIds: ['a1', 'a2'] });
    expect(h.revalidateTag).toHaveBeenCalledWith('user-reads-u1', 'max');
  });

  it('マージに失敗したらエラーをそのまま返し、キャッシュは無効化しない', async () => {
    const failure = err({ kind: 'INTERNAL' as const });
    h.merge.mockResolvedValue(failure);

    expect(await migrateGuestReads(['a1'])).toBe(failure);
    expect(h.revalidateTag).not.toHaveBeenCalled();
  });
});
