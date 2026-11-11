import { beforeEach, describe, expect, it, vi } from 'vitest';
import { err, ok } from '@/shared/result';

const h = vi.hoisted(() => ({
  getSession: vi.fn(),
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
  add: vi.fn(),
  toggle: vi.fn(),
  remove: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/cache', () => ({ updateTag: h.updateTag, revalidatePath: h.revalidatePath }));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/db/client', () => ({ db: {} }));
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: h.getSession } } }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../infrastructure/drizzle-user-feed-repository', () => ({
  DrizzleUserFeedRepository: class {},
}));
vi.mock('../infrastructure/rss-feed-fetcher', () => ({ rssFeedFetcher: vi.fn() }));
vi.mock('../application/add-user-feed', () => ({ addUserFeed: () => h.add }));
vi.mock('../application/toggle-user-feed', () => ({ toggleUserFeed: () => h.toggle }));
vi.mock('../application/remove-user-feed', () => ({ removeUserFeed: () => h.remove }));
vi.mock('../application/refresh-user-feed', () => ({ refreshUserFeed: () => h.refresh }));

const { addUserFeedAction, toggleUserFeedAction, removeUserFeedAction, refreshUserFeedAction } =
  await import('./actions');

const UNAUTHORIZED = err({ message: 'ログインが必要です' });

function expectNoInvalidation() {
  expect(h.updateTag).not.toHaveBeenCalled();
  expect(h.revalidatePath).not.toHaveBeenCalled();
}

function expectInvalidated() {
  // userFeeds タグはフィードのマージ版と設定一覧の両方に付くので、即時無効化(updateTag)で揃える。
  expect(h.updateTag).toHaveBeenCalledWith('user-feeds-u1');
  expect(h.revalidatePath).toHaveBeenCalledWith('/settings');
}

beforeEach(() => {
  vi.resetAllMocks();
  h.getSession.mockResolvedValue({ user: { id: 'u1' } });
});

describe('addUserFeedAction', () => {
  it('未ログインならログインを促すエラーを返し、登録もキャッシュ無効化もしない', async () => {
    h.getSession.mockResolvedValue(null);

    expect(await addUserFeedAction('https://example.com/feed')).toEqual(UNAUTHORIZED);
    expect(h.add).not.toHaveBeenCalled();
    expectNoInvalidation();
  });

  it('登録に成功したら件数を返し、マイフィードのキャッシュを無効化する', async () => {
    h.add.mockResolvedValue(ok({ added: 3 }));

    expect(await addUserFeedAction('https://example.com/feed')).toEqual(ok({ added: 3 }));
    expect(h.add).toHaveBeenCalledWith({ userId: 'u1', rssUrl: 'https://example.com/feed' });
    expectInvalidated();
  });

  it.each([
    [
      { kind: 'VALIDATION', message: 'URL の形式が正しくありません' },
      'URL の形式が正しくありません',
    ],
    [{ kind: 'DUPLICATE' }, 'このフィードはすでに登録されています'],
    [{ kind: 'LIMIT_EXCEEDED', limit: 50 }, '登録できるフィードは最大 50 件です'],
    [
      { kind: 'FETCH_FAILED', message: 'フィードを取得できませんでした' },
      'フィードを取得できませんでした',
    ],
  ] as const)(
    '失敗(%o)はトースト用の文言に変換し、キャッシュは無効化しない',
    async (error, message) => {
      h.add.mockResolvedValue(err(error));

      expect(await addUserFeedAction('https://example.com/feed')).toEqual(err({ message }));
      expectNoInvalidation();
    },
  );
});

describe('toggleUserFeedAction', () => {
  it('未ログインならエラーを返し、切り替えない', async () => {
    h.getSession.mockResolvedValue(null);

    expect(await toggleUserFeedAction({ id: 'f1', enabled: false })).toEqual(UNAUTHORIZED);
    expect(h.toggle).not.toHaveBeenCalled();
    expectNoInvalidation();
  });

  it('切り替えに成功したら新しい状態を返し、キャッシュを無効化する', async () => {
    h.toggle.mockResolvedValue(ok({ enabled: false }));

    expect(await toggleUserFeedAction({ id: 'f1', enabled: false })).toEqual(
      ok({ enabled: false }),
    );
    expect(h.toggle).toHaveBeenCalledWith({ userId: 'u1', id: 'f1', enabled: false });
    expectInvalidated();
  });

  it('失敗したら汎用の文言を返し、キャッシュは無効化しない', async () => {
    h.toggle.mockResolvedValue(err({ kind: 'NOT_FOUND' }));

    expect(await toggleUserFeedAction({ id: 'f1', enabled: true })).toEqual(
      err({ message: '更新に失敗しました' }),
    );
    expectNoInvalidation();
  });
});

describe('removeUserFeedAction', () => {
  it('未ログインならエラーを返し、削除しない', async () => {
    h.getSession.mockResolvedValue(null);

    expect(await removeUserFeedAction('f1')).toEqual(UNAUTHORIZED);
    expect(h.remove).not.toHaveBeenCalled();
    expectNoInvalidation();
  });

  it('削除に成功したらキャッシュを無効化する', async () => {
    h.remove.mockResolvedValue(ok(undefined));

    expect(await removeUserFeedAction('f1')).toEqual(ok(undefined));
    expect(h.remove).toHaveBeenCalledWith({ userId: 'u1', id: 'f1' });
    expectInvalidated();
  });

  it('失敗したら汎用の文言を返し、キャッシュは無効化しない', async () => {
    h.remove.mockResolvedValue(err({ kind: 'NOT_FOUND' }));

    expect(await removeUserFeedAction('f1')).toEqual(err({ message: '削除に失敗しました' }));
    expectNoInvalidation();
  });
});

describe('refreshUserFeedAction', () => {
  it('未ログインならエラーを返し、取得しない', async () => {
    h.getSession.mockResolvedValue(null);

    expect(await refreshUserFeedAction('f1')).toEqual(UNAUTHORIZED);
    expect(h.refresh).not.toHaveBeenCalled();
    expectNoInvalidation();
  });

  it('更新に成功したら取り込んだ件数を返し、キャッシュを無効化する', async () => {
    h.refresh.mockResolvedValue(ok({ added: 2 }));

    expect(await refreshUserFeedAction('f1')).toEqual(ok({ added: 2 }));
    expect(h.refresh).toHaveBeenCalledWith({ userId: 'u1', id: 'f1' });
    expectInvalidated();
  });

  it('取得に失敗したら取得失敗の文言を返し、キャッシュは無効化しない', async () => {
    h.refresh.mockResolvedValue(err({ kind: 'FETCH_FAILED', message: 'timeout' }));

    expect(await refreshUserFeedAction('f1')).toEqual(
      err({ message: '更新に失敗しました(フィードを取得できませんでした)' }),
    );
    expectNoInvalidation();
  });
});
