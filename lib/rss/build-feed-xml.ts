/**
 * 公開 RSS 2.0 フィードの XML を組み立てる純粋関数。
 * lib/ は features/ を import できないため、入力は素の型で受ける(組み立ては app 層が行う)。
 * 購読者の RSS リーダーを壊さないよう、エスケープと制御文字の除去をここに集約する。
 */

export type RssFeedItem = {
  title: string;
  /** 読者の遷移先(元記事 URL)。 */
  link: string;
  /** Techblo の記事ページ URL。永続的な識別子として guid に入れる。 */
  guid: string;
  /** 概要文。空なら description 要素自体を出さない。 */
  description: string | null;
  publishedAt: Date;
  /** 企業名。dc:creator と source に使う。 */
  companyName: string;
  /** source 要素の url(企業の Techblo フィード URL)。 */
  sourceUrl: string;
  categories: string[];
};

export type RssFeedChannel = {
  title: string;
  /** チャンネルに対応するサイト上のページ URL。 */
  link: string;
  description: string;
  /** このフィード自身の URL(atom:link rel="self")。 */
  selfUrl: string;
  language: string;
  lastBuildDate: Date;
  items: RssFeedItem[];
};

// XML 1.0 で許されない制御文字(タブ・改行・CR は許可)。取込記事に混入すると全体がパース不能になる。
// biome-ignore lint/suspicious/noControlCharactersInRegex: 制御文字の除去が目的
const INVALID_XML_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

/** 要素テキスト・属性値の両方で安全になるようエスケープする。 */
export function escapeXml(value: string): string {
  return value
    .replace(INVALID_XML_CHARS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** RFC 822 形式(RSS 2.0 の pubDate)。toUTCString は "Mon, 05 Oct 2026 00:00:00 GMT"。 */
export function toRfc822(date: Date): string {
  return date.toUTCString();
}

function renderItem(item: RssFeedItem): string {
  const lines = [
    '    <item>',
    `      <title>${escapeXml(item.title)}</title>`,
    `      <link>${escapeXml(item.link)}</link>`,
    `      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>`,
    `      <pubDate>${toRfc822(item.publishedAt)}</pubDate>`,
    `      <dc:creator>${escapeXml(item.companyName)}</dc:creator>`,
    `      <source url="${escapeXml(item.sourceUrl)}">${escapeXml(item.companyName)}</source>`,
  ];
  if (item.description?.trim()) {
    lines.push(`      <description>${escapeXml(item.description.trim())}</description>`);
  }
  for (const category of item.categories) {
    if (category.trim()) lines.push(`      <category>${escapeXml(category.trim())}</category>`);
  }
  lines.push('    </item>');
  return lines.join('\n');
}

export function buildFeedXml(channel: RssFeedChannel): string {
  const header = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    `    <title>${escapeXml(channel.title)}</title>`,
    `    <link>${escapeXml(channel.link)}</link>`,
    `    <description>${escapeXml(channel.description)}</description>`,
    `    <language>${escapeXml(channel.language)}</language>`,
    `    <lastBuildDate>${toRfc822(channel.lastBuildDate)}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(channel.selfUrl)}" rel="self" type="application/rss+xml"/>`,
  ];
  const items = channel.items.map(renderItem);
  return [...header, ...items, '  </channel>', '</rss>', ''].join('\n');
}
