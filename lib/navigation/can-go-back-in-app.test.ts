import { describe, expect, it } from 'vitest';
import { canGoBackInApp } from './can-go-back-in-app';

describe('canGoBackInApp', () => {
  it('follows the Navigation API when available', () => {
    expect(canGoBackInApp({ navigation: { canGoBack: true }, history: { length: 1 } })).toBe(true);
    // 外部サイトから同じタブで来た: 履歴は複数あるが同一オリジンの前エントリは無い
    expect(canGoBackInApp({ navigation: { canGoBack: false }, history: { length: 3 } })).toBe(
      false,
    );
  });

  it('falls back to the history length without the Navigation API', () => {
    expect(canGoBackInApp({ history: { length: 2 } })).toBe(true);
    expect(canGoBackInApp({ history: { length: 1 } })).toBe(false);
    expect(canGoBackInApp({ navigation: {}, history: { length: 1 } })).toBe(false);
  });
});
