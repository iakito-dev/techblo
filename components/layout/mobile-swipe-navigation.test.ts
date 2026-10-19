import { describe, expect, test } from 'vitest';
import {
  getSwipeNavigationHref,
  isBackSwipe,
  isHorizontalScroller,
  shouldIgnoreSwipeTarget,
} from './mobile-swipe-navigation';

describe('getSwipeNavigationHref', () => {
  test('moves to the previous main screen on a right swipe', () => {
    expect(
      getSwipeNavigationHref({
        pathname: '/favorites',
        startX: 40,
        startY: 120,
        endX: 142,
        endY: 128,
      }),
    ).toBe('/bookmarks');
  });

  test('moves to the next main screen on a left swipe', () => {
    expect(
      getSwipeNavigationHref({
        pathname: '/bookmarks',
        startX: 210,
        startY: 120,
        endX: 110,
        endY: 126,
      }),
    ).toBe('/favorites');
  });

  test('does not navigate from the ends of the main screen order', () => {
    expect(
      getSwipeNavigationHref({
        pathname: '/settings',
        startX: 210,
        startY: 120,
        endX: 110,
        endY: 126,
      }),
    ).toBeNull();

    expect(
      getSwipeNavigationHref({
        pathname: '/',
        startX: 40,
        startY: 120,
        endX: 142,
        endY: 128,
      }),
    ).toBeNull();
  });

  test('ignores mostly vertical swipes and short horizontal movement', () => {
    expect(
      getSwipeNavigationHref({
        pathname: '/',
        startX: 40,
        startY: 120,
        endX: 120,
        endY: 230,
      }),
    ).toBeNull();

    expect(
      getSwipeNavigationHref({
        pathname: '/',
        startX: 40,
        startY: 120,
        endX: 86,
        endY: 124,
      }),
    ).toBeNull();
  });

  test('matches nested paths to their parent main screen', () => {
    expect(
      getSwipeNavigationHref({
        pathname: '/bookmarks/archive',
        startX: 172,
        startY: 120,
        endX: 80,
        endY: 128,
      }),
    ).toBe('/favorites');
  });

  test('does not ignore links because most card surfaces are links', () => {
    expect(shouldIgnoreSwipeTarget('a')).toBe(false);
  });

  test('does not move between main screens from an article page', () => {
    expect(
      getSwipeNavigationHref({
        pathname: '/a/4f1f0f5c-5b3a-4a5c-9f0e-2c6f4b8d1a77',
        startX: 40,
        startY: 120,
        endX: 142,
        endY: 128,
      }),
    ).toBeNull();
  });

  test('ignores controls that should keep their own touch behavior', () => {
    expect(shouldIgnoreSwipeTarget('button')).toBe(true);
    expect(shouldIgnoreSwipeTarget('input')).toBe(true);
    expect(shouldIgnoreSwipeTarget('textarea')).toBe(true);
    expect(shouldIgnoreSwipeTarget('select')).toBe(true);
  });
});

describe('isBackSwipe', () => {
  const article = '/a/4f1f0f5c-5b3a-4a5c-9f0e-2c6f4b8d1a77';

  test('treats a right swipe on an article page as going back', () => {
    expect(isBackSwipe({ pathname: article, startX: 40, startY: 120, endX: 142, endY: 128 })).toBe(
      true,
    );
  });

  test('assigns nothing to a left swipe (記事ページに進む先は無い)', () => {
    expect(isBackSwipe({ pathname: article, startX: 210, startY: 120, endX: 110, endY: 126 })).toBe(
      false,
    );
  });

  test('ignores mostly vertical swipes and short horizontal movement', () => {
    expect(isBackSwipe({ pathname: article, startX: 40, startY: 120, endX: 120, endY: 230 })).toBe(
      false,
    );
    expect(isBackSwipe({ pathname: article, startX: 40, startY: 120, endX: 86, endY: 124 })).toBe(
      false,
    );
  });

  test('does not apply to the main screens (スワイプはタブ移動のまま)', () => {
    expect(
      isBackSwipe({ pathname: '/favorites', startX: 40, startY: 120, endX: 142, endY: 128 }),
    ).toBe(false);
    expect(isBackSwipe({ pathname: '/', startX: 40, startY: 120, endX: 142, endY: 128 })).toBe(
      false,
    );
  });
});

describe('isHorizontalScroller', () => {
  test('treats an overflowing overflow-x:auto row (category tabs) as a scroller', () => {
    expect(isHorizontalScroller({ overflowX: 'auto', scrollWidth: 948, clientWidth: 390 })).toBe(
      true,
    );
  });

  test('ignores a scrollable row whose content already fits', () => {
    expect(isHorizontalScroller({ overflowX: 'auto', scrollWidth: 390, clientWidth: 390 })).toBe(
      false,
    );
  });

  test('ignores overflowing content that cannot be scrolled', () => {
    expect(isHorizontalScroller({ overflowX: 'visible', scrollWidth: 948, clientWidth: 390 })).toBe(
      false,
    );
    expect(isHorizontalScroller({ overflowX: 'hidden', scrollWidth: 948, clientWidth: 390 })).toBe(
      false,
    );
  });
});
