import { describe, expect, it } from 'vitest';
import { canRefreshNow, REFRESH_COOLDOWN_MS } from './refresh-cooldown';

const now = new Date('2026-09-24T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms);

describe('canRefreshNow', () => {
  it('未取込ならクロールしてよい', () => {
    expect(canRefreshNow(null, now)).toBe(true);
  });

  it('クールダウン中はクロールしない', () => {
    expect(canRefreshNow(ago(REFRESH_COOLDOWN_MS - 1), now)).toBe(false);
  });

  it('クールダウンを過ぎたらクロールしてよい', () => {
    expect(canRefreshNow(ago(REFRESH_COOLDOWN_MS), now)).toBe(true);
  });
});
