import { describe, expect, it, vi } from 'vitest';
import { asUserId } from '@/shared/type-utils';
import type { BookmarkRepository } from '../domain/bookmark-repository';
import { listBookmarkedArticleIds } from './list-bookmarked-article-ids';

const userId = asUserId('user-1');

describe('listBookmarkedArticleIds', () => {
  it('リポジトリが返した順序のまま id 一覧を返す', async () => {
    const listArticleIds = vi.fn().mockResolvedValue(['a-2', 'a-1']);
    const bookmarks = { listArticleIds } as unknown as BookmarkRepository;
    const result = await listBookmarkedArticleIds({ bookmarks })({ userId });
    expect(listArticleIds).toHaveBeenCalledExactlyOnceWith(userId);
    expect(result).toEqual({ ok: true, value: ['a-2', 'a-1'] });
  });

  it('ブックマークが無ければ空配列', async () => {
    const bookmarks = {
      listArticleIds: vi.fn().mockResolvedValue([]),
    } as unknown as BookmarkRepository;
    const result = await listBookmarkedArticleIds({ bookmarks })({ userId });
    expect(result).toEqual({ ok: true, value: [] });
  });
});
