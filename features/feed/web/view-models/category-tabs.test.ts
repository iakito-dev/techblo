import { describe, expect, it } from 'vitest';
import { buildCategoryTabHref, parseCategoryTab } from './category-tabs';

describe('parseCategoryTab', () => {
  it('既知のカテゴリキーはそのまま返す', () => {
    expect(parseCategoryTab('ai')).toBe('ai');
    expect(parseCategoryTab('event')).toBe('event');
  });

  it('未指定・不正値は latest(新着)に丸める', () => {
    expect(parseCategoryTab(undefined)).toBe('latest');
    expect(parseCategoryTab(null)).toBe('latest');
    expect(parseCategoryTab('')).toBe('latest');
    expect(parseCategoryTab('unknown')).toBe('latest');
  });
});

describe('buildCategoryTabHref', () => {
  it('新着(latest)を選ぶと ?category= を削除する', () => {
    const params = new URLSearchParams('category=ai');
    expect(buildCategoryTabHref(params, 'latest')).toBe('/');
  });

  it('カテゴリを選ぶと ?category=<key> をセットする', () => {
    const params = new URLSearchParams();
    expect(buildCategoryTabHref(params, 'infra')).toBe('/?category=infra');
  });

  it('他のクエリパラメータ(q/company/read/sort/period/tag/feed)を保持する', () => {
    const params = new URLSearchParams(
      'q=react&company=aws&read=unread&sort=popular&period=week&tag=AI&feed=abc',
    );
    const href = buildCategoryTabHref(params, 'ai');
    const result = new URLSearchParams(href.replace(/^\/\?/, ''));
    expect(result.get('category')).toBe('ai');
    expect(result.get('q')).toBe('react');
    expect(result.get('company')).toBe('aws');
    expect(result.get('read')).toBe('unread');
    expect(result.get('sort')).toBe('popular');
    expect(result.get('period')).toBe('week');
    expect(result.get('tag')).toBe('AI');
    expect(result.get('feed')).toBe('abc');
  });

  it('page= は必ず削除する', () => {
    const params = new URLSearchParams('page=3&company=aws');
    const href = buildCategoryTabHref(params, 'devex');
    const result = new URLSearchParams(href.replace(/^\/\?/, ''));
    expect(result.get('page')).toBeNull();
    expect(result.get('category')).toBe('devex');
    expect(result.get('company')).toBe('aws');
  });

  it('不正なキーは無視して新着(category 削除)扱いにする', () => {
    const params = new URLSearchParams('category=ai&company=aws');
    const href = buildCategoryTabHref(params, 'not-a-real-category');
    const result = new URLSearchParams(href.replace(/^\/\?/, ''));
    expect(result.get('category')).toBeNull();
    expect(result.get('company')).toBe('aws');
  });
});
