import { describe, expect, test } from 'vitest';
import {
  GUEST_FILTER_MAX_EMPTY_PAGES,
  isGuestReadFilterStalled,
  shouldTriggerAutoLoad,
} from './feed-infinite-scroll';

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

describe('shouldTriggerAutoLoad when stalled', () => {
  test('does not trigger while the guest read filter is stalled', () => {
    expect(
      shouldTriggerAutoLoad({
        hasMore: true,
        isIntersecting: true,
        isPending: false,
        stalled: true,
      }),
    ).toBe(false);
  });
});

describe('isGuestReadFilterStalled', () => {
  const base = { isGuest: true, readMode: 'read' as const, guestReadCount: 5, emptyPageStreak: 0 };

  test('never stalls for signed-in users or without a read filter', () => {
    expect(isGuestReadFilterStalled({ ...base, isGuest: false, guestReadCount: 0 })).toBe(false);
    expect(
      isGuestReadFilterStalled({ ...base, readMode: 'all', guestReadCount: 0, emptyPageStreak: 9 }),
    ).toBe(false);
  });

  test('stalls immediately for the read filter when the guest has read nothing', () => {
    expect(isGuestReadFilterStalled({ ...base, guestReadCount: 0 })).toBe(true);
  });

  test('keeps loading the unread filter even with no reads', () => {
    expect(isGuestReadFilterStalled({ ...base, readMode: 'unread', guestReadCount: 0 })).toBe(
      false,
    );
  });

  test('stalls after consecutive pages that added nothing visible', () => {
    expect(
      isGuestReadFilterStalled({ ...base, emptyPageStreak: GUEST_FILTER_MAX_EMPTY_PAGES - 1 }),
    ).toBe(false);
    expect(
      isGuestReadFilterStalled({ ...base, emptyPageStreak: GUEST_FILTER_MAX_EMPTY_PAGES }),
    ).toBe(true);
  });
});
