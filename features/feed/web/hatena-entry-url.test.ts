import { describe, expect, it } from 'vitest';
import { hatenaEntryUrl } from './hatena-entry-url';

describe('hatenaEntryUrl', () => {
  it('https の記事は entry/s/ にスキームを除いた URL を続ける', () => {
    expect(hatenaEntryUrl('https://engineering.mercari.com/blog/entry/20261101-x/')).toBe(
      'https://b.hatena.ne.jp/entry/s/engineering.mercari.com/blog/entry/20261101-x/',
    );
  });

  it('http の記事は s/ を挟まない', () => {
    expect(hatenaEntryUrl('http://example.com/posts/1')).toBe(
      'https://b.hatena.ne.jp/entry/example.com/posts/1',
    );
  });

  it('クエリは残し、フラグメントは落とす', () => {
    expect(hatenaEntryUrl('https://example.com/p?id=1#top')).toBe(
      'https://b.hatena.ne.jp/entry/s/example.com/p?id=1',
    );
  });

  it('http(s) 以外・壊れた URL は null', () => {
    expect(hatenaEntryUrl('javascript:alert(1)')).toBeNull();
    expect(hatenaEntryUrl('ftp://example.com/a')).toBeNull();
    expect(hatenaEntryUrl('not a url')).toBeNull();
  });
});
