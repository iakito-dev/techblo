import { describe, expect, it } from 'vitest';
import { resolveFilteredEmptyCopy } from './filtered-empty-copy';

const base = { sort: 'latest' as const, period: 'all' as const, readMode: 'all' as const };

describe('resolveFilteredEmptyCopy', () => {
  it('returns null without any filter so the "no articles yet" state stays', () => {
    expect(resolveFilteredEmptyCopy(base)).toBeNull();
    expect(resolveFilteredEmptyCopy({ ...base, companySlugs: [], feedIds: [] })).toBeNull();
  });

  it('names the tag and links the tag index for a tag-only filter', () => {
    const copy = resolveFilteredEmptyCopy({ ...base, tag: 'Rust' });
    expect(copy?.title).toBe('「#Rust」の記事はありません');
    expect(copy?.showTagIndexLink).toBe(true);
    expect(copy?.clearHref).toBe('/');
  });

  it('explains how articles become read for an empty read filter', () => {
    expect(resolveFilteredEmptyCopy({ ...base, readMode: 'read' })?.title).toBe(
      '既読の記事はまだありません',
    );
  });

  it('says everything is read for an empty unread filter', () => {
    expect(resolveFilteredEmptyCopy({ ...base, readMode: 'unread' })?.title).toBe(
      '未読の記事はありません',
    );
  });

  it.each([
    { category: 'ai' },
    { companySlugs: ['sansan'] },
    { feedIds: ['f1'] },
    { period: 'today' as const },
    { tag: 'Rust', companySlugs: ['sansan'] },
    { readMode: 'read' as const, category: 'ai' },
  ])('falls back to the generic filtered copy for %o', (filters) => {
    const copy = resolveFilteredEmptyCopy({ ...base, ...filters });
    expect(copy?.title).toBe('条件に一致する記事はありません');
    expect(copy?.showTagIndexLink).toBe(false);
  });

  it('keeps the popular sort when clearing filters', () => {
    expect(resolveFilteredEmptyCopy({ ...base, sort: 'popular', category: 'ai' })?.clearHref).toBe(
      '/?sort=popular',
    );
  });
});
