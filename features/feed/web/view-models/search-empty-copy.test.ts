import { describe, expect, it } from 'vitest';
import { resolveSearchEmptyCopy } from './search-empty-copy';

const base = {
  query: 'Rust',
  sort: 'latest' as const,
  period: 'all' as const,
  readMode: 'all' as const,
};

describe('resolveSearchEmptyCopy', () => {
  it('suggests other keywords without offering to drop filters when nothing is filtered', () => {
    const copy = resolveSearchEmptyCopy({ ...base, companySlugs: [], feedIds: [] });
    expect(copy.searchAllHref).toBeNull();
    expect(copy.hint).not.toContain('絞り込み');
  });

  it.each([
    ['company', { companySlugs: ['zozo'] }],
    ['my feed', { feedIds: ['f1'] }],
    ['tag', { tag: 'LLM' }],
    ['category', { category: 'ai' }],
    ['period', { period: 'week' as const }],
    ['read filter', { readMode: 'unread' as const }],
  ])('offers to search everything with the same query when filtered by %s', (_, filter) => {
    const copy = resolveSearchEmptyCopy({ ...base, ...filter });
    expect(copy.searchAllHref).toBe('/?q=Rust');
    expect(copy.hint).toContain('絞り込み');
  });

  it('keeps the popular sort because it is an ordering, not a filter', () => {
    const copy = resolveSearchEmptyCopy({
      ...base,
      sort: 'popular',
      period: 'today',
      companySlugs: ['zozo'],
    });
    expect(copy.searchAllHref).toBe('/?q=Rust&sort=popular');
  });

  it('encodes the query in the URL', () => {
    const copy = resolveSearchEmptyCopy({ ...base, query: 'C++ & Go', tag: 'x' });
    expect(copy.searchAllHref).toBe('/?q=C%2B%2B+%26+Go');
  });
});
