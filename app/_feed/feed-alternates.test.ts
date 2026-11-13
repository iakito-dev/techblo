import { describe, expect, it } from 'vitest';
import { feedAlternateLinks } from './feed-alternates';

const ALL = { url: '/feed.xml', title: 'テクブロ 新着' };

describe('feedAlternateLinks', () => {
  it('絞り込みが無ければ全体フィードだけ', () => {
    expect(feedAlternateLinks({})).toEqual([ALL]);
    expect(feedAlternateLinks({ tag: '  ', category: ' ' })).toEqual([ALL]);
  });

  it('タグはタグ別フィードを全体より先に出す(URL エンコードする)', () => {
    expect(feedAlternateLinks({ tag: ' CI/CD ' })).toEqual([
      { url: '/feed.xml?tag=CI%2FCD', title: '#CI/CD の新着' },
      ALL,
    ]);
  });

  it('有効なカテゴリはカテゴリ別フィード、不正なキーは無視する', () => {
    expect(feedAlternateLinks({ category: 'ai' })).toEqual([
      { url: '/feed.xml?category=ai', title: 'AI・機械学習 の新着' },
      ALL,
    ]);
    expect(feedAlternateLinks({ category: 'not-a-category' })).toEqual([ALL]);
  });

  it('カテゴリとタグの併用は 1 本のフィードにまとめる', () => {
    expect(feedAlternateLinks({ category: 'ai', tag: 'LLM' })).toEqual([
      { url: '/feed.xml?category=ai&tag=LLM', title: 'AI・機械学習 #LLM の新着' },
      ALL,
    ]);
  });

  it('企業は企業別フィード。タグと併用ならタグ別 → 企業別 → 全体の順', () => {
    const company = { slug: 'mercari', name: 'メルカリ' };
    expect(feedAlternateLinks({ company })).toEqual([
      { url: '/companies/mercari/feed.xml', title: 'メルカリ の新着' },
      ALL,
    ]);
    expect(feedAlternateLinks({ company, tag: 'SRE' }).map((l) => l.url)).toEqual([
      '/feed.xml?tag=SRE',
      '/companies/mercari/feed.xml',
      '/feed.xml',
    ]);
  });
});
