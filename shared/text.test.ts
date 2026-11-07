import { describe, expect, it } from 'vitest';
import { hasNul, stripNul } from './text';

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
