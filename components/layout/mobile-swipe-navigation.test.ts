import { describe, expect, test } from 'vitest';
import {
  exitDurationMs,
  hasSwipeDestination,
  isBrowserEdgeGesture,
  isHorizontalScroller,
  shouldCommitSwipe,
  shouldIgnoreSwipeTarget,
} from './mobile-swipe-navigation';

const article = '/a/4f1f0f5c-5b3a-4a5c-9f0e-2c6f4b8d1a77';

describe('hasSwipeDestination', () => {
  test('右スワイプは前のタブ、左スワイプは次のタブへ行ける', () => {
    expect(hasSwipeDestination('/favorites', 10)).toBe(true);
    expect(hasSwipeDestination('/bookmarks', -10)).toBe(true);
  });

  test('並びの両端から外側へは行き先が無い', () => {
    expect(hasSwipeDestination('/', 10)).toBe(false);
    expect(hasSwipeDestination('/settings', -10)).toBe(false);
  });

  test('配下のパスは親の主要画面として扱う', () => {
    expect(hasSwipeDestination('/settings/feeds', 10)).toBe(true);
    expect(hasSwipeDestination('/settings/feeds', -10)).toBe(false);
  });

  test('記事ページは右(= 戻る)だけ。左には何も割り当てない', () => {
    expect(hasSwipeDestination(article, 10)).toBe(true);
    expect(hasSwipeDestination(article, -10)).toBe(false);
  });

  test('主要画面でも記事ページでもないルートや移動 0 は対象外', () => {
    expect(hasSwipeDestination('/companies/mercari', 10)).toBe(false);
    expect(hasSwipeDestination('/bookmarks', 0)).toBe(false);
  });
});

describe('shouldCommitSwipe', () => {
  const viewportWidth = 390;

  test('画面幅の 30% 以上ゆっくり引けば確定する', () => {
    expect(shouldCommitSwipe({ deltaX: 120, velocityX: 0.05, viewportWidth })).toBe(true);
    expect(shouldCommitSwipe({ deltaX: -120, velocityX: -0.05, viewportWidth })).toBe(true);
  });

  test('ゆっくり少しだけ引いて離したら確定しない', () => {
    expect(shouldCommitSwipe({ deltaX: 80, velocityX: 0.1, viewportWidth })).toBe(false);
  });

  test('素早く払えば短い距離でも確定する', () => {
    expect(shouldCommitSwipe({ deltaX: 50, velocityX: 0.6, viewportWidth })).toBe(true);
    expect(shouldCommitSwipe({ deltaX: -50, velocityX: -0.6, viewportWidth })).toBe(true);
  });

  test('速くてもタップのぶれ程度の移動は確定しない', () => {
    expect(shouldCommitSwipe({ deltaX: 20, velocityX: 0.8, viewportWidth })).toBe(false);
  });

  test('指を戻しながら離したら、距離が足りていても取り消す', () => {
    expect(shouldCommitSwipe({ deltaX: 200, velocityX: -0.4, viewportWidth })).toBe(false);
    expect(shouldCommitSwipe({ deltaX: -200, velocityX: 0.4, viewportWidth })).toBe(false);
  });
});

describe('exitDurationMs', () => {
  test('残り距離が長いほど時間を掛け、上下限で丸める', () => {
    expect(exitDurationMs(390, 390)).toBe(240);
    expect(exitDurationMs(0, 390)).toBe(110);
    expect(exitDurationMs(195, 390)).toBe(175);
    expect(exitDurationMs(-10, 390)).toBe(110);
    expect(exitDurationMs(800, 390)).toBe(240);
  });
});

describe('shouldIgnoreSwipeTarget', () => {
  test('カードの面はほぼリンクなので、リンクでは無視しない', () => {
    expect(shouldIgnoreSwipeTarget('a')).toBe(false);
  });

  test('自前のタッチ操作を持つコントロールでは無視する', () => {
    expect(shouldIgnoreSwipeTarget('button')).toBe(true);
    expect(shouldIgnoreSwipeTarget('input')).toBe(true);
    expect(shouldIgnoreSwipeTarget('textarea')).toBe(true);
    expect(shouldIgnoreSwipeTarget('select')).toBe(true);
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

describe('isBrowserEdgeGesture', () => {
  test('左右端 24px 以内で始まった指はブラウザの端スワイプとして扱う', () => {
    expect(isBrowserEdgeGesture(0, 390)).toBe(true);
    expect(isBrowserEdgeGesture(24, 390)).toBe(true);
    expect(isBrowserEdgeGesture(366, 390)).toBe(true);
    expect(isBrowserEdgeGesture(390, 390)).toBe(true);
  });

  test('端から離れた位置はアプリのスワイプとして扱う', () => {
    expect(isBrowserEdgeGesture(25, 390)).toBe(false);
    expect(isBrowserEdgeGesture(195, 390)).toBe(false);
    expect(isBrowserEdgeGesture(365, 390)).toBe(false);
  });
});
