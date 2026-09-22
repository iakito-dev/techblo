import { fromZonedTime } from 'date-fns-tz';
import { XMLParser } from 'fast-xml-parser';
import { logger } from '@/lib/observability/logger';
import { err, ok, type Result } from '@/shared/result';
import {
  ARTICLE_DESCRIPTION_MAX_LENGTH,
  type ArticleInput,
  articleInputSchema,
  type ParseError,
} from './types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // CDATA や HTML を含むテキストをそのまま保持
  processEntities: true,
  trimValues: true,
});

/**
 * パースオプション。
 * - feedTimezone: 指定すると pubDate の宣言 TZ を無視し、壁時計をこの IANA TZ で解釈する
 *   (TZ 欠落/誤記フィードの補正。ADR-0025)。null/未指定なら宣言 TZ を信用する。
 * - now: 未来日付ガードの基準時刻(テスト用。既定は現在時刻)。
 */
export type ParseFeedOptions = { feedTimezone?: string | null; now?: Date };

/**
 * RSS 2.0 / Atom フィードを ArticleInput[] に正規化する。
 *
 * - 個々の item/entry が壊れていてもスキップして続行(全体を落とさない)
 * - 形式(RSS/Atom)は自動判定
 */
export function parseFeed(
  xml: string,
  opts: ParseFeedOptions = {},
): Result<ArticleInput[], ParseError> {
  let doc: unknown;
  try {
    doc = parser.parse(xml);
  } catch (e) {
    return err({ kind: 'INVALID_XML', message: e instanceof Error ? e.message : String(e) });
  }

  const root = doc as Record<string, unknown>;
  const ctx = { feedTimezone: opts.feedTimezone ?? null, now: opts.now ?? new Date() };

  if (root.rss) {
    return parseRss2(root.rss as Record<string, unknown>, ctx);
  }
  if (root.feed) {
    return parseAtom(root.feed as Record<string, unknown>, ctx);
  }
  return err({ kind: 'UNKNOWN_FORMAT', message: 'neither <rss> nor <feed> root found' });
}

/**
 * フィードのメタ情報(チャンネル/フィードのタイトルとサイト URL)を抽出する。
 * マイフィード登録時に表示名を決めるために使う(記事一覧の取得とは別経路)。
 * 解釈できなければ各フィールド null。
 */
export function parseFeedMeta(xml: string): { title: string | null; siteUrl: string | null } {
  let doc: unknown;
  try {
    doc = parser.parse(xml);
  } catch {
    return { title: null, siteUrl: null };
  }
  const root = doc as Record<string, unknown>;

  if (root.rss) {
    const channel = (root.rss as Record<string, unknown>).channel as
      | Record<string, unknown>
      | undefined;
    if (!channel) return { title: null, siteUrl: null };
    return { title: text(channel.title), siteUrl: text(channel.link) };
  }
  if (root.feed) {
    const feed = root.feed as Record<string, unknown>;
    return { title: text(feed.title), siteUrl: extractAtomLink(feed.link) };
  }
  return { title: null, siteUrl: null };
}

type ParseCtx = { feedTimezone: string | null; now: Date };

// ─────────────────────────────────────────────
// RSS 2.0
// ─────────────────────────────────────────────
function parseRss2(
  rss: Record<string, unknown>,
  ctx: ParseCtx,
): Result<ArticleInput[], ParseError> {
  const channel = rss.channel as Record<string, unknown> | undefined;
  if (!channel) return err({ kind: 'NO_ITEMS', message: 'no <channel>' });

  const items = toArray(channel.item);
  if (items.length === 0) return err({ kind: 'NO_ITEMS', message: 'no <item>' });

  const articles: ArticleInput[] = [];
  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    const url = text(item.link);
    const candidate = {
      url,
      title: text(item.title),
      description: normalizeDescription(text(item['content:encoded']) ?? text(item.description)),
      ogImage: extractRssImage(item),
      author: text(item['dc:creator']) ?? text(item.author),
      publishedAt: resolvePublishedAt(text(item.pubDate) ?? text(item['dc:date']), ctx, url),
    };
    pushValid(articles, candidate);
  }
  return ok(articles);
}

// ─────────────────────────────────────────────
// Atom
// ─────────────────────────────────────────────
function parseAtom(
  feed: Record<string, unknown>,
  ctx: ParseCtx,
): Result<ArticleInput[], ParseError> {
  const entries = toArray(feed.entry);
  if (entries.length === 0) return err({ kind: 'NO_ITEMS', message: 'no <entry>' });

  const articles: ArticleInput[] = [];
  for (const raw of entries) {
    const entry = raw as Record<string, unknown>;
    const url = extractAtomLink(entry.link);
    const candidate = {
      url,
      title: text(entry.title),
      description: normalizeDescription(text(entry.content) ?? text(entry.summary)),
      ogImage: extractAtomImage(entry),
      author: extractAtomAuthor(entry.author),
      publishedAt: resolvePublishedAt(text(entry.published) ?? text(entry.updated), ctx, url),
    };
    pushValid(articles, candidate);
  }
  return ok(articles);
}

// ─────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────
function pushValid(acc: ArticleInput[], candidate: unknown): void {
  const parsed = articleInputSchema.safeParse(candidate);
  if (parsed.success) {
    acc.push(parsed.data);
  } else {
    // 1件の不正は警告だけして全体は止めない
    logger.warn('skip invalid feed item', {
      issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    });
  }
}

function toArray(v: unknown): unknown[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * fast-xml-parser はテキストノードを string / number / object(属性付き)で返す。
 * object の場合は `#text` を拾う。
 */
function text(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'object') {
    const t = (v as Record<string, unknown>)['#text'];
    if (typeof t === 'string') return t.trim() || null;
    if (typeof t === 'number') return String(t);
  }
  return null;
}

// 未来日付の許容スキュー。これを超えて未来の publishedAt は取込時刻にクランプする。
const FUTURE_SKEW_MS = 10 * 60_000;

const RFC822_MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const ISO_WALLCLOCK = /(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;
const RFC822_WALLCLOCK = /(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/;

/**
 * 日付文字列から壁時計(年月日時分秒)だけを抽出する。宣言された TZ オフセットは捨てる。
 * ISO8601 と RFC822(月名)の両方に対応。抽出できなければ null。
 */
function extractWallClock(v: string): string | null {
  const pad = (n: number | string) => String(n).padStart(2, '0');

  const iso = ISO_WALLCLOCK.exec(v);
  if (iso) {
    const [, y, mo, d, hh, mm, ss] = iso;
    if (!y || !mo || !d || !hh || !mm) return null;
    return `${y}-${mo}-${d}T${hh}:${mm}:${pad(ss ?? '00')}`;
  }

  const rfc = RFC822_WALLCLOCK.exec(v);
  if (rfc) {
    const [, day, monAbbr, year, hh, mm, ss] = rfc;
    if (!day || !monAbbr || !year || !hh || !mm) return null;
    const month = RFC822_MONTHS[monAbbr.slice(0, 3).toLowerCase()];
    if (month === undefined) return null;
    return `${year}-${pad(month)}-${pad(day)}T${hh}:${mm}:${pad(ss ?? '00')}`;
  }

  return null;
}

/**
 * pubDate/published を Date に変換する。
 * - feedTimezone なし: 宣言 TZ を信用して `new Date()` で解釈(従来動作)。
 * - feedTimezone あり: 宣言 TZ を無視し、壁時計をその TZ のローカル時刻として UTC へ変換(ADR-0025)。
 */
function parseDate(v: string | null, feedTimezone: string | null): Date | null {
  if (!v) return null;

  if (feedTimezone) {
    const wall = extractWallClock(v);
    if (wall) {
      const d = fromZonedTime(wall, feedTimezone);
      if (!Number.isNaN(d.getTime())) return d;
    }
    // 壁時計を抽出できない形式は宣言 TZ にフォールバック
  }

  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * publishedAt を確定する。TZ 補正の後、許容スキューを超えて未来の値は取込時刻にクランプする
 * (TZ 未設定/誤設定のフィードでも「未来日付で並びが壊れ、相対表記が『たった今』固定になる」のを防ぐ。ADR-0025)。
 */
function resolvePublishedAt(v: string | null, ctx: ParseCtx, url: string | null): Date | null {
  const parsed = parseDate(v, ctx.feedTimezone);
  if (!parsed) return null;

  if (parsed.getTime() > ctx.now.getTime() + FUTURE_SKEW_MS) {
    logger.warn('future publishedAt clamped to ingest time', {
      url,
      raw: v,
      publishedAt: parsed.toISOString(),
      feedTimezone: ctx.feedTimezone,
    });
    return ctx.now;
  }
  return parsed;
}

function normalizeDescription(v: string | null): string | null {
  if (!v) return null;
  return v.length > ARTICLE_DESCRIPTION_MAX_LENGTH ? v.slice(0, ARTICLE_DESCRIPTION_MAX_LENGTH) : v;
}

// Atom の <link> は複数あり得る。rel="alternate" か href を持つものを優先
function extractAtomLink(link: unknown): string | null {
  for (const l of toArray(link)) {
    if (typeof l === 'string') return l;
    const obj = l as Record<string, unknown>;
    const rel = obj['@_rel'];
    const href = obj['@_href'];
    if ((rel === undefined || rel === 'alternate') && typeof href === 'string') {
      return href;
    }
  }
  // fallback: 最初の href
  const first = toArray(link)[0] as Record<string, unknown> | undefined;
  const href = first?.['@_href'];
  return typeof href === 'string' ? href : null;
}

function extractAtomAuthor(author: unknown): string | null {
  const a = toArray(author)[0];
  if (!a) return null;
  if (typeof a === 'string') return a;
  return text((a as Record<string, unknown>).name);
}

// RSS: media:thumbnail / media:content / enclosure / content内のimg を順に試す
function extractRssImage(item: Record<string, unknown>): string | null {
  const mediaThumb = (item['media:thumbnail'] ?? item['media:content']) as
    | Record<string, unknown>
    | undefined;
  const mediaUrl = mediaThumb?.['@_url'];
  if (typeof mediaUrl === 'string') return mediaUrl;

  const enclosure = item.enclosure as Record<string, unknown> | undefined;
  const encUrl = enclosure?.['@_url'];
  const encType = enclosure?.['@_type'];
  if (typeof encUrl === 'string' && (typeof encType !== 'string' || encType.startsWith('image'))) {
    return encUrl;
  }

  return firstImgInHtml(text(item['content:encoded']) ?? text(item.description));
}

function extractAtomImage(entry: Record<string, unknown>): string | null {
  const mediaThumb = entry['media:thumbnail'] as Record<string, unknown> | undefined;
  const mediaUrl = mediaThumb?.['@_url'];
  if (typeof mediaUrl === 'string') return mediaUrl;
  return firstImgInHtml(text(entry.content) ?? text(entry.summary));
}

function firstImgInHtml(html: string | null): string | null {
  if (!html) return null;
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}
