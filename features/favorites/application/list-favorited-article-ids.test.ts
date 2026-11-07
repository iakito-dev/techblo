import { describe, expect, it, vi } from 'vitest';
import { asUserId } from '@/shared/type-utils';
import type { FavoriteRepository } from '../domain/favorite-repository';
import { listFavoritedArticleIds } from './list-favorited-article-ids';

const userId = asUserId('user-1');

describe('listFavoritedArticleIds', () => {
  it('リポジトリが返した順序のまま id 一覧を返す', async () => {
    const listArticleIds = vi.fn().mockResolvedValue(['a-2', 'a-1']);
    const favorites = { listArticleIds } as unknown as FavoriteRepository;
    const result = await listFavoritedArticleIds({ favorites })({ userId });
    expect(listArticleIds).toHaveBeenCalledExactlyOnceWith(userId);
    expect(result).toEqual({ ok: true, value: ['a-2', 'a-1'] });
  });

  it('お気に入りが無ければ空配列', async () => {
    const favorites = {
      listArticleIds: vi.fn().mockResolvedValue([]),
    } as unknown as FavoriteRepository;
    const result = await listFavoritedArticleIds({ favorites })({ userId });
    expect(result).toEqual({ ok: true, value: [] });
  });
});
