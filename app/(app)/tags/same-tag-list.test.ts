import { describe, expect, it } from 'vitest';
import { isSameTagList } from './same-tag-list';

describe('isSameTagList', () => {
  const a = [
    { tag: 'React', count: 3 },
    { tag: 'Go', count: 1 },
  ];
  it('同じ並び・件数なら true', () => {
    expect(isSameTagList(a, [...a])).toBe(true);
  });
  it('件数が違えば false', () => {
    expect(
      isSameTagList(a, [
        { tag: 'React', count: 3 },
        { tag: 'Go', count: 2 },
      ]),
    ).toBe(false);
  });
  it('長さが違えば false', () => {
    expect(isSameTagList(a, a.slice(0, 1))).toBe(false);
  });
  it('両方空なら true', () => {
    expect(isSameTagList([], [])).toBe(true);
  });
});
