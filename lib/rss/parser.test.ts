import { describe, expect, it } from 'vitest';
import { isErr, isOk } from '@/shared/result';
import { parseFeed } from './parser';
import { ARTICLE_DESCRIPTION_MAX_LENGTH } from './types';

const RSS2 = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Example Tech Blog</title>
    <item>
      <title>RSS記事タイトル</title>
      <link>https://example.com/posts/1</link>
      <description>これは抜粋です</description>
      <dc:creator>山田太郎</dc:creator>
      <pubDate>Mon, 25 May 2026 09:00:00 +0900</pubDate>
      <content:encoded><![CDATA[<p>本文 <img src="https://example.com/img/1.png" /> です</p>]]></content:encoded>
    </item>
    <item>
      <title>画像なし記事</title>
      <link>https://example.com/posts/2</link>
      <description>抜粋のみ</description>
      <pubDate>Sun, 24 May 2026 09:00:00 +0900</pubDate>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example Atom Feed</title>
  <entry>
    <title>Atom記事タイトル</title>
    <link rel="alternate" href="https://example.com/atom/1" />
    <published>2026-05-25T00:00:00Z</published>
    <author><name>佐藤花子</name></author>
    <content type="html">&lt;p&gt;Atom本文 &lt;img src="https://example.com/atom.png" /&gt;&lt;/p&gt;</content>
  </entry>
</feed>`;

describe('parseFeed - RSS 2.0', () => {
  it('parses items into ArticleInput', () => {
    const r = parseFeed(RSS2);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value).toHaveLength(2);

    const first = r.value[0];
    expect(first?.title).toBe('RSS記事タイトル');
    expect(first?.url).toBe('https://example.com/posts/1');
    expect(first?.author).toBe('山田太郎');
    expect(first?.publishedAt.getUTCFullYear()).toBe(2026);
  });

  it('prefers content:encoded over description', () => {
    const r = parseFeed(RSS2);
    if (!isOk(r)) throw new Error('expected ok');
    expect(r.value[0]?.description).toContain('本文');
  });

  it('keeps full-content feed items by trimming overlong descriptions', () => {
    const longContent = 'a'.repeat(ARTICLE_DESCRIPTION_MAX_LENGTH + 500);
    const feed = `<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel>
      <item>
        <title>最新記事</title>
        <link>https://example.com/posts/latest</link>
        <pubDate>Mon, 25 May 2026 09:00:00 +0900</pubDate>
        <content:encoded><![CDATA[${longContent}]]></content:encoded>
      </item>
    </channel></rss>`;

    const r = parseFeed(feed);
    if (!isOk(r)) throw new Error('expected ok');
    expect(r.value).toHaveLength(1);
    expect(r.value[0]?.title).toBe('最新記事');
    expect(r.value[0]?.description).toHaveLength(ARTICLE_DESCRIPTION_MAX_LENGTH);
  });

  it('extracts first <img> from content as ogImage', () => {
    const r = parseFeed(RSS2);
    if (!isOk(r)) throw new Error('expected ok');
    expect(r.value[0]?.ogImage).toBe('https://example.com/img/1.png');
  });

  it('sets ogImage null when no image present', () => {
    const r = parseFeed(RSS2);
    if (!isOk(r)) throw new Error('expected ok');
    expect(r.value[1]?.ogImage).toBeNull();
  });
});

describe('parseFeed - Atom', () => {
  it('parses entries into ArticleInput', () => {
    const r = parseFeed(ATOM);
    expect(isOk(r)).toBe(true);
    if (!isOk(r)) return;
    expect(r.value).toHaveLength(1);

    const e = r.value[0];
    expect(e?.title).toBe('Atom記事タイトル');
    expect(e?.url).toBe('https://example.com/atom/1');
    expect(e?.author).toBe('佐藤花子');
    expect(e?.ogImage).toBe('https://example.com/atom.png');
  });
});

describe('parseFeed - error handling', () => {
  it('returns UNKNOWN_FORMAT for non-feed XML', () => {
    const r = parseFeed('<html><body>not a feed</body></html>');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('UNKNOWN_FORMAT');
  });

  it('returns NO_ITEMS for empty channel', () => {
    const r = parseFeed('<rss version="2.0"><channel><title>x</title></channel></rss>');
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.kind).toBe('NO_ITEMS');
  });

  it('skips invalid items but keeps valid ones', () => {
    const mixed = `<rss version="2.0"><channel>
      <item><title>有効</title><link>https://example.com/ok</link><pubDate>Mon, 25 May 2026 09:00:00 +0900</pubDate></item>
      <item><title>URL不正</title><link>not-a-url</link><pubDate>Mon, 25 May 2026 09:00:00 +0900</pubDate></item>
    </channel></rss>`;
    const r = parseFeed(mixed);
    if (!isOk(r)) throw new Error('expected ok');
    expect(r.value).toHaveLength(1);
    expect(r.value[0]?.title).toBe('有効');
  });
});

describe('parseFeed - timezone correction (ADR-0025)', () => {
  // メルカリと同型: 壁時計は JST(10:00) だが TZ を GMT と誤記している
  const GMT_MISLABELED = `<rss version="2.0"><channel>
    <item><title>TZ誤記</title><link>https://example.com/tz</link>
    <pubDate>Fri, 12 Jun 2026 10:00:39 GMT</pubDate></item>
  </channel></rss>`;
  // 未来基準時刻(ガードでクランプされないように記事日時より後)
  const futureNow = new Date('2026-06-13T00:00:00Z');

  it('feedTimezone 指定時は宣言 TZ を無視し壁時計をその TZ で解釈する', () => {
    const r = parseFeed(GMT_MISLABELED, { feedTimezone: 'Asia/Tokyo', now: futureNow });
    if (!isOk(r)) throw new Error('expected ok');
    // 10:00 JST = 01:00 UTC
    expect(r.value[0]?.publishedAt.toISOString()).toBe('2026-06-12T01:00:39.000Z');
  });

  it('feedTimezone 未指定なら宣言 TZ(GMT)を信用する(従来動作)', () => {
    const r = parseFeed(GMT_MISLABELED, { now: futureNow });
    if (!isOk(r)) throw new Error('expected ok');
    expect(r.value[0]?.publishedAt.toISOString()).toBe('2026-06-12T10:00:39.000Z');
  });

  it('オフセットの無い ISO8601 も feedTimezone で解釈する', () => {
    const isoNoTz = `<feed xmlns="http://www.w3.org/2005/Atom">
      <entry><title>ISO</title><link href="https://example.com/iso"/>
      <published>2026-06-12T10:00:00</published></entry></feed>`;
    const r = parseFeed(isoNoTz, { feedTimezone: 'Asia/Tokyo', now: futureNow });
    if (!isOk(r)) throw new Error('expected ok');
    expect(r.value[0]?.publishedAt.toISOString()).toBe('2026-06-12T01:00:00.000Z');
  });

  it('許容スキューを超えて未来の publishedAt は取込時刻にクランプする', () => {
    const now = new Date('2026-06-12T00:00:00Z');
    // 宣言 GMT のまま → 10:00Z は now(00:00Z) より十分未来
    const r = parseFeed(GMT_MISLABELED, { now });
    if (!isOk(r)) throw new Error('expected ok');
    expect(r.value[0]?.publishedAt.toISOString()).toBe(now.toISOString());
  });
});
