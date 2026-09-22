import { describe, expect, it } from 'vitest';
import { DEFAULT_PERIOD, parsePeriod } from './feed-sort';

describe('parsePeriod', () => {
  it('既知の期間はそのまま返す', () => {
    expect(parsePeriod('today')).toBe('today');
    expect(parsePeriod('week')).toBe('week');
    expect(parsePeriod('month')).toBe('month');
    expect(parsePeriod('all')).toBe('all');
  });

  it('未指定・不正値は既定(all)に丸める', () => {
    expect(parsePeriod(undefined)).toBe(DEFAULT_PERIOD);
    expect(parsePeriod('')).toBe('all');
    expect(parsePeriod('yearly')).toBe('all');
  });
});
