import { describe, expect, it } from 'vitest';
import type { ArticleCategory } from '@/shared/categories';
import { SHELF_CATEGORIES } from '@/shared/categories';
import type { ArticleCard } from './dto';
import { buildFeedSections, hasNoShelves, SHELF_ITEM_COUNT } from './list-sections';

const makeCard = (id: string): ArticleCard => ({
  id,
  url: `https://example.com/${id}`,
  title: `記事${id}`,
  description: null,
  ogImage: null,
  author: null,
  publishedAt: new Date(2026, 0, 1),
  viewCount: 0,
  bookmarkCount: 0,
  hatenaBookmarkCount: 0,
  company: { slug: 'example', name: 'Example', brandColor: '#000000' },
});

const categorized = (id: string, category: ArticleCategory) => ({
  article: makeCard(id),
  category,
});

describe('buildFeedSections', () => {
  it('新着に出た記事は棚・イベントから除外する(重複禁止)', () => {
    const latest = [makeCard('dup-1'), makeCard('new-2')];
    const sections = buildFeedSections({
      latest,
      categorized: [
        categorized('dup-1', 'ai'),
        categorized('ai-2', 'ai'),
        categorized('ai-3', 'ai'),
      ],
    });
    const aiShelf = sections.shelves.find((s) => s.category === 'ai');
    expect(aiShelf?.items.map((a) => a.id)).toEqual(['ai-2', 'ai-3']);
  });

  it('SHELF_ITEM_COUNT に満たない棚はある分だけ返す', () => {
    const sections = buildFeedSections({
      latest: [],
      categorized: [categorized('ai-1', 'ai'), categorized('ai-2', 'ai')],
    });
    const aiShelf = sections.shelves.find((s) => s.category === 'ai');
    expect(aiShelf?.items).toHaveLength(2);
  });

  it('棚は SHELF_ITEM_COUNT(最大列数ぶん)で切り詰める', () => {
    const sections = buildFeedSections({
      latest: [],
      categorized: Array.from({ length: SHELF_ITEM_COUNT + 2 }, (_, i) =>
        categorized(`ai-${i}`, 'ai'),
      ),
    });
    const aiShelf = sections.shelves.find((s) => s.category === 'ai');
    expect(aiShelf?.items).toHaveLength(SHELF_ITEM_COUNT);
  });

  it('0本の棚は結果から落とす', () => {
    const sections = buildFeedSections({
      latest: [],
      categorized: [categorized('ai-1', 'ai')],
    });
    expect(sections.shelves.map((s) => s.category)).toEqual(['ai']);
    expect(sections.shelves.some((s) => s.category === 'infra')).toBe(false);
  });

  it('event は棚に含めず、events に最大 EVENTS_COUNT 件だけ渡す', () => {
    const eventItems = Array.from({ length: 8 }, (_, i) => categorized(`ev-${i}`, 'event'));
    const sections = buildFeedSections({ latest: [], categorized: eventItems });
    expect(sections.shelves.some((s) => s.category === 'event')).toBe(false);
    expect(sections.events).toHaveLength(6);
    expect(sections.events.map((a) => a.id)).toEqual([
      'ev-0',
      'ev-1',
      'ev-2',
      'ev-3',
      'ev-4',
      'ev-5',
    ]);
  });

  it('棚は SHELF_CATEGORIES の並び順で返す', () => {
    const sections = buildFeedSections({
      latest: [],
      categorized: [
        categorized('org-1', 'org'),
        categorized('ai-1', 'ai'),
        categorized('infra-1', 'infra'),
      ],
    });
    expect(sections.shelves.map((s) => s.category)).toEqual(
      SHELF_CATEGORIES.filter((c) => ['org', 'ai', 'infra'].includes(c)),
    );
  });
});

describe('hasNoShelves', () => {
  it('全棚0本のとき true を返す(フォールバック判定)', () => {
    const sections = buildFeedSections({ latest: [], categorized: [] });
    expect(hasNoShelves(sections)).toBe(true);
  });

  it('1つでも棚があれば false', () => {
    const sections = buildFeedSections({
      latest: [],
      categorized: [categorized('ai-1', 'ai')],
    });
    expect(hasNoShelves(sections)).toBe(false);
  });
});
