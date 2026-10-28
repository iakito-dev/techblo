import { describe, expect, it, vi } from 'vitest';
import { asUserFeedId, asUserId } from '@/shared/type-utils';
import type { UserFeedRepository } from '../domain/user-feed-repository';
import { toggleUserFeed } from './toggle-user-feed';

const userId = asUserId('user-1');
const id = asUserFeedId('feed-1');

describe('toggleUserFeed', () => {
  it.each([true, false])('enabled=%s をそのまま setEnabled に渡して返す', async (enabled) => {
    const setEnabled = vi.fn().mockResolvedValue(undefined);
    const feeds = { setEnabled } as unknown as UserFeedRepository;
    const result = await toggleUserFeed({ feeds })({ userId, id, enabled });
    expect(setEnabled).toHaveBeenCalledExactlyOnceWith(userId, id, enabled);
    expect(result).toEqual({ ok: true, value: { enabled } });
  });
});
