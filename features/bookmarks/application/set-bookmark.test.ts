import { describe, expect, it, vi } from 'vitest';
import { asArticleId, asUserId } from '@/shared/type-utils';
import type { BookmarkRepository } from '../domain/bookmark-repository';
import { setBookmark } from './set-bookmark';

function fakeRepo(): BookmarkRepository {
  return { listArticleIds: vi.fn(), add: vi.fn(), remove: vi.fn(), addMany: vi.fn() };
}

describe('setBookmark', () => {
  const input = { userId: asUserId('u1'), articleId: asArticleId('a1') };

  it('bookmarked=true で add を呼び remove は呼ばない', async () => {
    const repo = fakeRepo();
    const result = await setBookmark({ bookmarks: repo })({ ...input, bookmarked: true });
    expect(repo.add).toHaveBeenCalledOnce();
    expect(repo.remove).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, value: { bookmarked: true } });
  });

  it('bookmarked=false で remove を呼び add は呼ばない', async () => {
    const repo = fakeRepo();
    const result = await setBookmark({ bookmarks: repo })({ ...input, bookmarked: false });
    expect(repo.remove).toHaveBeenCalledOnce();
    expect(repo.add).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, value: { bookmarked: false } });
  });
});
