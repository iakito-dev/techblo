import { describe, expect, test } from 'vitest';
import { shouldTriggerAutoLoad } from './feed-infinite-scroll';

describe('shouldTriggerAutoLoad', () => {
  test('triggers only when sentinel intersects while more items are available and no request is pending', () => {
    expect(
      shouldTriggerAutoLoad({
        hasMore: true,
        isIntersecting: true,
        isPending: false,
      }),
    ).toBe(true);
  });

  test('does not trigger while loading or when there are no more items', () => {
    expect(
      shouldTriggerAutoLoad({
        hasMore: true,
        isIntersecting: true,
        isPending: true,
      }),
    ).toBe(false);
    expect(
      shouldTriggerAutoLoad({
        hasMore: false,
        isIntersecting: true,
        isPending: false,
      }),
    ).toBe(false);
    expect(
      shouldTriggerAutoLoad({
        hasMore: true,
        isIntersecting: false,
        isPending: false,
      }),
    ).toBe(false);
  });
});
