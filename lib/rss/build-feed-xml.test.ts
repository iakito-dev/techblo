import { XMLParser } from 'fast-xml-parser';
import { describe, expect, it } from 'vitest';
import { buildFeedXml, escapeXml, type RssFeedItem, toRfc822 } from './build-feed-xml';

const item = (over: Partial<RssFeedItem> = {}): RssFeedItem => ({
  title: '記事',
  link: 'https://example.com/post',
  guid: 'https://techblo.dev/a/1',
  description: '概要',
  publishedAt: new Date('2026-10-05T00:00:00Z'),
  companyName: 'Example',
  sourceUrl: 'https://techblo.dev/companies/example/feed.xml',
  categories: ['AI'],
  ...over,
});

const channel = (items: RssFeedItem[]) => ({
  title: 'テクブロ',
  link: 'https://techblo.dev/',
  description: '説明',
  selfUrl: 'https://techblo.dev/feed.xml',
  language: 'ja',
  lastBuildDate: new Date('2026-10-05T01:00:00Z'),
  items,
});

describe('escapeXml', () => {
  it('5 つの特殊文字をエスケープする', () => {
    expect(escapeXml(`<a href="x">&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;',
    );
  });

  it('XML で許されない制御文字を除去する', () => {
    expect(escapeXml('a\u0000b\u0008c\u001Fd\te\nf')).toBe('abcd\te\nf');
  });

  it('CDATA 終端 ]]> を無害化する', () => {
    expect(escapeXml('x]]>y')).toBe('x]]&gt;y');
  });
});

describe('toRfc822', () => {
  it('RFC 822 形式で返す', () => {
    expect(toRfc822(new Date('2026-10-05T00:00:00Z'))).toBe('Mon, 05 Oct 2026 00:00:00 GMT');
  });
});

describe('buildFeedXml', () => {
  it('channel のメタ情報と atom:self を含む', () => {
    const xml = buildFeedXml(channel([]));
    expect(xml).toContain('<language>ja</language>');
    expect(xml).toContain('<lastBuildDate>Mon, 05 Oct 2026 01:00:00 GMT</lastBuildDate>');
    expect(xml).toContain('<atom:link href="https://techblo.dev/feed.xml" rel="self"');
  });

  it('item の件数がそのまま出力される', () => {
    const xml = buildFeedXml(channel([item(), item({ guid: 'g2' }), item({ guid: 'g3' })]));
    expect(xml.match(/<item>/g)).toHaveLength(3);
  });

  it('description が null / 空白なら item の description 要素を出さない', () => {
    const xml = buildFeedXml(channel([item({ description: null }), item({ description: '  ' })]));
    // channel の分のみ
    expect(xml.match(/<description>/g)).toHaveLength(1);
  });

  it('guid は isPermaLink=false', () => {
    expect(buildFeedXml(channel([item()]))).toContain(
      '<guid isPermaLink="false">https://techblo.dev/a/1</guid>',
    );
  });

  it('危険な文字を含んでも整形式の XML になる', () => {
    const xml = buildFeedXml(
      channel([
        item({
          title: 'A & B <script>"x"</script>\u0000',
          description: ']]> <b>',
          categories: ['C&C'],
        }),
      ]),
    );
    const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
    expect(parsed.rss.channel.item.title).toBe('A & B <script>"x"</script>');
    expect(parsed.rss.channel.item.description).toBe(']]> <b>');
    expect(parsed.rss.channel.item.category).toBe('C&C');
  });
});
