import { describe, expect, it, vi } from 'vitest';
import { asArticleId, asUserId } from '@/shared/type-utils';
import type { FavoriteRepository } from '../domain/favorite-repository';
import { setFavorite } from './set-favorite';

function fakeRepo(): FavoriteRepository {
  return { listArticleIds: vi.fn(), add: vi.fn(), remove: vi.fn(), addMany: vi.fn() };
}

describe('setFavorite', () => {
  const input = { userId: asUserId('u1'), articleId: asArticleId('a1') };

  it('favorited=true で add を呼び remove は呼ばない', async () => {
    const repo = fakeRepo();
    const result = await setFavorite({ favorites: repo })({ ...input, favorited: true });
    expect(repo.add).toHaveBeenCalledOnce();
    expect(repo.remove).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, value: { favorited: true } });
  });

  it('favorited=false で remove を呼び add は呼ばない', async () => {
    const repo = fakeRepo();
    const result = await setFavorite({ favorites: repo })({ ...input, favorited: false });
    expect(repo.remove).toHaveBeenCalledOnce();
    expect(repo.add).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, value: { favorited: false } });
  });
});
