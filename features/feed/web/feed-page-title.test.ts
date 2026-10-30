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

  it('人気順でも検索・タグがあればそちらを優先する', () => {
    expect(feedPageTitle({ q: 'go', sort: 'popular' })).toBe('「go」の検索結果');
    expect(feedPageTitle({ tag: 'SRE', sort: 'popular' })).toBe('#SRE の記事');
  });

  it('長い入力は 40 文字で切る(サロゲートペアを壊さない)', () => {
    const title = feedPageTitle({ q: '😀'.repeat(50) });
    expect(title).toBe(`「${'😀'.repeat(40)}…」の検索結果`);
  });
});
