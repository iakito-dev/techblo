import { describe, expect, it } from 'vitest';
import { formatCount, hasNul, stripNul } from './text';

describe('stripNul', () => {
  it('NUL だけを取り除く', () => {
    expect(stripNul('a\u0000b\u0000')).toBe('ab');
    expect(stripNul('\u0000')).toBe('');
  });

  it('NUL が無ければそのまま返す', () => {
    expect(stripNul('React Hooks')).toBe('React Hooks');
    expect(stripNul('')).toBe('');
  });
});

describe('hasNul', () => {
  it('NUL の有無を返す', () => {
    expect(hasNul('a\u0000')).toBe(true);
    expect(hasNul('abc')).toBe(false);
  });
});

describe('formatCount', () => {
  it('4 桁以上を 3 桁区切りにする', () => {
    expect(formatCount(1035)).toBe('1,035');
    expect(formatCount(1234567)).toBe('1,234,567');
  });

  it('3 桁以下はそのまま', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(999)).toBe('999');
  });
});
