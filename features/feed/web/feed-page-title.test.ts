import { describe, expect, it } from 'vitest';
import { feedPageTitle } from './feed-page-title';

describe('feedPageTitle', () => {
  it('絞り込みが無ければ undefined(既定タイトルのまま)', () => {
    expect(feedPageTitle({})).toBeUndefined();
    expect(feedPageTitle({ q: '  ', tag: ' ' })).toBeUndefined();
  });

  it('検索語は前後の空白を落として「…」の検索結果にする', () => {
    expect(feedPageTitle({ q: ' React ' })).toBe('「React」の検索結果');
  });

  it('タグは #タグ の記事にする', () => {
    expect(feedPageTitle({ tag: 'Kubernetes' })).toBe('#Kubernetes の記事');
  });

  it('検索とタグが併用されたら検索を優先する', () => {
    expect(feedPageTitle({ q: 'go', tag: 'SRE' })).toBe('「go」の検索結果');
  });

  it('人気順は「人気の記事」、新着順は既定のまま', () => {
    expect(feedPageTitle({ sort: 'popular' })).toBe('人気の記事');
    expect(feedPageTitle({ sort: 'latest' })).toBeUndefined();
  });

  it('企業は「企業名 の記事」にする(タグより後・人気順より前)', () => {
    expect(feedPageTitle({ company: ' mercari ' })).toBe('mercari の記事');
    expect(feedPageTitle({ company: 'mercari', tag: 'SRE' })).toBe('#SRE の記事');
    expect(feedPageTitle({ company: 'mercari', sort: 'popular' })).toBe('mercari の記事');
  });

  it('カテゴリは「表示名 の記事」にする(不正なキーは無視)', () => {
    expect(feedPageTitle({ category: 'ai' })).toBe('AI・機械学習 の記事');
    expect(feedPageTitle({ category: 'ai', sort: 'popular' })).toBe('AI・機械学習 の記事');
    expect(feedPageTitle({ category: 'not-a-category' })).toBeUndefined();
  });

  it('未読/既読は「未読の記事」/「既読の記事」にする(all・不正な値は無視)', () => {
    expect(feedPageTitle({ read: 'unread' })).toBe('未読の記事');
    expect(feedPageTitle({ read: 'read', sort: 'popular' })).toBe('既読の記事');
    expect(feedPageTitle({ read: 'all' })).toBeUndefined();
    expect(feedPageTitle({ read: 'bogus' })).toBeUndefined();
    // マイフィードで絞っているときは見出し(「フィード」)と揃えて既定タイトルのまま
    expect(feedPageTitle({ read: 'unread', feed: 'f1' })).toBeUndefined();
  });

  it('検索・タグ・企業はカテゴリ・未読/既読より優先する', () => {
    expect(feedPageTitle({ q: 'go', read: 'unread' })).toBe('「go」の検索結果');
    expect(feedPageTitle({ tag: 'SRE', category: 'ai' })).toBe('#SRE の記事');
    expect(feedPageTitle({ company: 'mercari', read: 'unread' })).toBe('mercari の記事');
    expect(feedPageTitle({ category: 'ai', read: 'unread' })).toBe('AI・機械学習 の記事');
  });

  it('人気順でも検索・タグがあればそちらを優先する', () => {
    expect(feedPageTitle({ q: 'go', sort: 'popular' })).toBe('「go」の検索結果');
    expect(feedPageTitle({ tag: 'SRE', sort: 'popular' })).toBe('#SRE の記事');
  });

  it('長い入力は 40 文字で切る(サロゲートペアを壊さない)', () => {
    const title = feedPageTitle({ q: '😀'.repeat(50) });
    expect(title).toBe(`「${'😀'.repeat(40)}…」の検索結果`);
  });
});
