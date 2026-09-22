import { z } from 'zod';
import { type ArticleCategory, articleCategorySchema } from '@/shared/categories';
import type { ArticleId } from '@/shared/type-utils';

/**
 * AI記事要約のドメインエンティティ。外部依存ゼロ(ADR-0026)。
 *
 * bullets は1〜3行の箇条書き。status='failed' のときは bullets が空でも成立する
 * (失敗を記録して再課金・無限リトライを防ぐため)。
 */
export type SummaryStatus = 'ready' | 'failed';
export type SummarySource = 'full_text' | 'rss_excerpt';

/**
 * 箇条書き1件。見出し(体言止めの短い要点)+ 説明(です/ます調で具体・数値を伴う1〜2文)。
 * 参考: 記事ページの「ざっくりまとめ」体裁。
 */
export type ArticleSummaryBullet = {
  heading: string;
  detail: string;
};

/** カテゴリ定義(表示名・並び順・棚か否か)の唯一の正は `shared/categories.ts`(ADR-0034)。この import 経由で再公開する。 */
export type { ArticleCategory };

export type ArticleSummary = {
  articleId: ArticleId;
  /** 記事全体を1文で表す概要(TL;DR)。status='failed' のときは空文字。 */
  overview: string;
  bullets: ArticleSummaryBullet[];
  tags: string[];
  /** 記事カテゴリ。分類ステップ未実行 or 分類失敗は null(ADR-0034)。 */
  category: ArticleCategory | null;
  model: string;
  source: SummarySource;
  status: SummaryStatus;
  generatedAt: Date;
};

/** 概要(1文)の最大長。 */
export const MAX_OVERVIEW_LENGTH = 120;
/** 箇条書きの見出し・説明の最大長。長すぎる出力は破綻とみなして弾く。 */
export const MAX_BULLET_HEADING_LENGTH = 60;
export const MAX_BULLET_DETAIL_LENGTH = 220;
export const MAX_TAG_LENGTH = 24;

/**
 * LLM 出力の検証スキーマ。概要は1文・箇条書きは1〜3件(見出し+説明とも非空)・各長さ上限。
 * ここを通らない出力は壊れた要約として status='failed' にする(記事ページに出さない)。
 */
export const overviewSchema = z.string().trim().min(1).max(MAX_OVERVIEW_LENGTH);
export const bulletSchema = z.object({
  heading: z.string().trim().min(1).max(MAX_BULLET_HEADING_LENGTH),
  detail: z.string().trim().min(1).max(MAX_BULLET_DETAIL_LENGTH),
});
export const bulletsSchema = z.array(bulletSchema).min(1).max(3);
export const tagsSchema = z.array(z.string().trim().min(1).max(MAX_TAG_LENGTH)).max(5);

export type OverviewParseResult = { ok: true; overview: string } | { ok: false; issues: string[] };
export type BulletsParseResult =
  | { ok: true; bullets: ArticleSummaryBullet[] }
  | { ok: false; issues: string[] };
export type TagsParseResult = { ok: true; tags: string[] } | { ok: false; issues: string[] };
export type CategoryParseResult =
  | { ok: true; category: ArticleCategory }
  | { ok: false; issues: string[] };

/** LLM の概要出力(1文)を検証して正規化する。throw しない。 */
export function parseOverview(raw: unknown): OverviewParseResult {
  const result = overviewSchema.safeParse(typeof raw === 'string' ? raw.trim() : raw);
  if (result.success) return { ok: true, overview: result.data };
  return { ok: false, issues: result.error.issues.map((i) => i.message) };
}

/**
 * 記事の中身ではなく「要約そのもの」や一般論しか述べていない空疎な行。
 * 本文をうまく拾えなかったときにモデルが出しやすく(実データで観測)、長さ・行数の
 * Zod 検証は通ってしまう。中身のない要約はユーザーにとって「要約なし」より悪いので、
 * こうした行は要約として採用しない(全行が該当すれば1行未満となり failed = 非表示)。
 */
const META_BULLET_PATTERNS: RegExp[] = [
  /要約です。?$/,
  /判断材料に(なり|な)/,
  /元記事(へ|を)(進む|読む|開く)前/,
  /^(この|本)?記事の(論点|要点|内容|概要)を/,
  /観点を(確認|把握|チェック)でき/,
];

function isMetaBullet(line: string): boolean {
  return META_BULLET_PATTERNS.some((re) => re.test(line.trim()));
}

/** 見出しが中身のない定型文の箇条書きか。 */
function isMetaBulletItem(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false;
  const heading = (item as { heading?: unknown }).heading;
  return typeof heading === 'string' && isMetaBullet(heading);
}

/** LLM の生出力(見出し+説明の配列)を検証して正規化する。throw しない。 */
export function parseBullets(raw: unknown): BulletsParseResult {
  // 見出しが中身のない定型文の項目は検証前に落とす。残りが1件未満なら Zod の min(1) で failed になる。
  const candidate = Array.isArray(raw) ? raw.filter((item) => !isMetaBulletItem(item)) : raw;
  const result = bulletsSchema.safeParse(candidate);
  if (result.success) return { ok: true, bullets: result.data };
  return { ok: false, issues: result.error.issues.map((i) => i.message) };
}

/** LLM のタグ出力を表示用タグとして検証して正規化する。検索/分類用途には使わない。 */
export function parseTags(raw: unknown): TagsParseResult {
  const result = tagsSchema.safeParse(raw);
  if (result.success) return { ok: true, tags: Array.from(new Set(result.data)) };
  return { ok: false, issues: result.error.issues.map((i) => i.message) };
}

/**
 * LLM のカテゴリ出力(単一キー文字列)を検証する。throw しない。
 * enum 外の値・非文字列は issues を伴う failed として返し、呼び出し側は category=null で
 * categorizedAt だけ更新する(同じ記事を毎回再試行し続けないため)。
 */
export function parseCategory(raw: unknown): CategoryParseResult {
  const result = articleCategorySchema.safeParse(typeof raw === 'string' ? raw.trim() : raw);
  if (result.success) return { ok: true, category: result.data };
  return { ok: false, issues: result.error.issues.map((i) => i.message) };
}
