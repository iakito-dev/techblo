import { describe, expect, test } from 'vitest';
import {
  filterAndSortSaved,
  matchesSavedQuery,
  normalizeQuery,
  type SavedFilterItem,
} from './saved-articles-filter';

const item = (over: Partial<SavedFilterItem> = {}): SavedFilterItem => ({
  title: 'Next.js 16 の PPR 入門',
  companyName: 'メルカリ',
  publishedAt: new Date('2026-01-01'),
  ...over,
});

describe('normalizeQuery', () => {
  test('全角英数を半角にし小文字化する', () => {
    expect(normalizeQuery('ＤｅＮＡ')).toBe('dena');
  });
});

describe('matchesSavedQuery', () => {
  test('空・空白のみは全件一致', () => {
    expect(matchesSavedQuery(item(), '')).toBe(true);
    expect(matchesSavedQuery(item(), '  　 ')).toBe(true);
  });

  test('タイトル・企業名・概要・タグを部分一致で探す', () => {
    const it = item({ overview: 'レンダリング戦略の解説', tags: ['React'] });
    expect(matchesSavedQuery(it, 'ppr')).toBe(true);
    expect(matchesSavedQuery(it, 'メルカ')).toBe(true);
    expect(matchesSavedQuery(it, 'レンダリング')).toBe(true);
    expect(matchesSavedQuery(it, 'react')).toBe(true);
    expect(matchesSavedQuery(it, 'Kubernetes')).toBe(false);
  });

  test('全角スペース・半角スペース区切りは AND', () => {
    expect(matchesSavedQuery(item(), 'ppr メルカリ')).toBe(true);
    expect(matchesSavedQuery(item(), 'ppr　メルカリ')).toBe(true);
    expect(matchesSavedQuery(item(), 'ppr ヤフー')).toBe(false);
  });

  test('全角英字でも一致する', () => {
    expect(matchesSavedQuery(item(), 'ＰＰＲ')).toBe(true);
  });
});

describe('filterAndSortSaved', () => {
  const list = [
    { id: 'a', ...item({ title: 'A', publishedAt: new Date('2026-02-01') }) },
    { id: 'b', ...item({ title: 'B', publishedAt: new Date('2026-03-01') }) },
    { id: 'c', ...item({ title: 'C', publishedAt: new Date('2026-01-01') }) },
  ];
  const ids = (xs: typeof list) => xs.map((x) => x.id);

  test('savedAt は入力順を保つ', () => {
    expect(ids(filterAndSortSaved(list, (x) => x, '', 'savedAt'))).toEqual(['a', 'b', 'c']);
  });

  test('公開日の降順・昇順', () => {
    expect(ids(filterAndSortSaved(list, (x) => x, '', 'publishedAtDesc'))).toEqual(['b', 'a', 'c']);
    expect(ids(filterAndSortSaved(list, (x) => x, '', 'publishedAtAsc'))).toEqual(['c', 'a', 'b']);
  });

  test('絞り込みと並び替えを併用し、入力配列は変更しない', () => {
    const copy = [...list];
    const out = filterAndSortSaved(list, (x) => x, 'a b', 'publishedAtAsc');
    expect(out).toEqual([]);
    expect(ids(filterAndSortSaved(list, (x) => x, 'b', 'publishedAtDesc'))).toEqual(['b']);
    expect(list).toEqual(copy);
  });
});
