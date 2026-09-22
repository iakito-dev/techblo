import { describe, expect, test } from 'vitest';
import { getNextBottomChromeHidden } from './bottom-chrome-visibility';

describe('getNextBottomChromeHidden', () => {
  test('keeps bottom chrome visible near the top of the page', () => {
    expect(getNextBottomChromeHidden({ currentY: 95, lastY: 120, hidden: true })).toBe(false);
  });

  test('hides bottom chrome after scrolling down past the jitter threshold', () => {
    expect(getNextBottomChromeHidden({ currentY: 140, lastY: 120, hidden: false })).toBe(true);
  });

  test('shows bottom chrome after scrolling up past the jitter threshold', () => {
    expect(getNextBottomChromeHidden({ currentY: 120, lastY: 140, hidden: true })).toBe(false);
  });

  test('keeps the current state for small scroll jitter', () => {
    expect(getNextBottomChromeHidden({ currentY: 125, lastY: 120, hidden: false })).toBe(false);
    expect(getNextBottomChromeHidden({ currentY: 125, lastY: 120, hidden: true })).toBe(true);
  });
});
