import { describe, expect, it, vi } from 'vitest';
import { asUserFeedId, asUserId } from '@/shared/type-utils';
import type { UserFeedRepository } from '../domain/user-feed-repository';
import { removeUserFeed } from './remove-user-feed';

describe('removeUserFeed', () => {
  it('所有者 id とフィード id を remove に渡して ok を返す', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const feeds = { remove } as unknown as UserFeedRepository;
    const userId = asUserId('user-1');
    const id = asUserFeedId('feed-1');
    const result = await removeUserFeed({ feeds })({ userId, id });
    expect(remove).toHaveBeenCalledExactlyOnceWith(userId, id);
    expect(result).toEqual({ ok: true, value: undefined });
  });
});
