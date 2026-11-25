import { describe, expect, it } from 'vitest';
import { buildFeedHref, feedFiltersPatch } from './feed-href';

describe('buildFeedHref', () => {
  it('patch の値をセットし、他のクエリパラメータは保持する', () => {
    const params = new URLSearchParams('q=react&tag=LLM&category=ai');
    expect(buildFeedHref(params, { sort: 'popular' })).toBe(
      '/?q=react&tag=LLM&category=ai&sort=popular',
    );
  });

  it('null と空文字はそのキーを削除する', () => {
    const params = new URLSearchParams('sort=popular&company=mercari&q=go');
    expect(buildFeedHref(params, { sort: null, company: '' })).toBe('/?q=go');
  });

  it('?page= は patch に関係なく常に削除する', () => {
    expect(buildFeedHref(new URLSearchParams('page=3&sort=popular'), {})).toBe('/?sort=popular');
    expect(buildFeedHref(new URLSearchParams('page=3'), { company: 'mercari' })).toBe(
      '/?company=mercari',
    );
  });

  it('残るクエリが無ければ / を返す', () => {
    expect(buildFeedHref(new URLSearchParams('q=go&page=2'), { q: null })).toBe('/');
    expect(buildFeedHref(new URLSearchParams(), {})).toBe('/');
  });

  it('既存の値を上書きし、繰り返しキーは 1 つにまとめる', () => {
    const params = new URLSearchParams('company=a&company=b');
    expect(buildFeedHref(params, { company: 'c' })).toBe('/?company=c');
  });

  it('日本語や記号を含む値をエンコードする', () => {
    expect(buildFeedHref(new URLSearchParams(), { tag: '生成AI', q: 'CI/CD & テスト' })).toBe(
      `/?tag=${encodeURIComponent('生成AI')}&q=CI%2FCD+%26+%E3%83%86%E3%82%B9%E3%83%88`,
    );
  });

  it('呼び出し元の URLSearchParams を書き換えない', () => {
    const params = new URLSearchParams('page=2&sort=popular');
    buildFeedHref(params, { sort: null });
    expect(params.toString()).toBe('page=2&sort=popular');
  });
});

describe('feedFiltersPatch', () => {
  it('既定値(all / 空配列)はキーごと消す patch にする', () => {
    const patch = feedFiltersPatch({ status: 'all', period: 'all', companies: [], userFeeds: [] });
    expect(
      buildFeedHref(new URLSearchParams('read=unread&period=week&company=a&feed=x'), patch),
    ).toBe('/');
  });

  it('選択中の条件を read / period / company / feed にする(複数はカンマ区切り)', () => {
    const patch = feedFiltersPatch({
      status: 'unread',
      period: 'week',
      companies: ['mercari', 'lycorp'],
      userFeeds: ['f1'],
    });
    expect(patch).toEqual({
      read: 'unread',
      period: 'week',
      company: 'mercari,lycorp',
      feed: 'f1',
    });
    expect(buildFeedHref(new URLSearchParams('sort=popular&q=go'), patch)).toBe(
      '/?sort=popular&q=go&read=unread&period=week&company=mercari%2Clycorp&feed=f1',
    );
  });
});
