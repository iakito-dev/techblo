/**
 * サイドバーのタグ絞り込み(?tag=)の固定キュレーション(ADR-0027)。
 *
 * AI生成の表示タグ(`article_summaries.tags`)は自由記述で正規化されていないため、
 * - 需要の高い代表キーワードだけを手動で並べる(候補の発散を抑える)
 * - 表記ゆれ・類義語を `aliases` でグループ化し、1エントリで束ねて絞り込む(=正規化)
 * を行う。`label` はサイドバー表示 兼 `?tag=` の値(canonical)。`aliases` は突き合わせる
 * 生タグ群(label 自身も含めて完全一致で OR する)。件数は実データ(article_summaries.tags の
 * 出現頻度)に基づき、人気上位を選定している。
 *
 * 正規化検索基盤ではなく「ゆるい絞り込みの取っ掛かり」という割り切りは ADR-0027 のまま。
 * 検索の主経路は引き続き ILIKE 全文検索(?q=・ADR-0022)。
 */
export type CuratedTag = {
  /** サイドバー表示 兼 ?tag= の値。 */
  label: string;
  /** 完全一致で突き合わせる生タグ群(label 自身も含む)。 */
  aliases: string[];
};

export const CURATED_TAGS: readonly CuratedTag[] = [
  { label: 'AI・LLM', aliases: ['AI・LLM', '生成AI', 'AI', 'LLM', '機械学習'] },
  { label: 'AWS', aliases: ['AWS', 'Amazon Bedrock'] },
  { label: 'Google Cloud', aliases: ['Google Cloud'] },
  { label: 'Kubernetes', aliases: ['Kubernetes'] },
  { label: 'Terraform', aliases: ['Terraform', 'IaC'] },
  { label: 'CI/CD', aliases: ['CI/CD', 'GitHub Actions'] },
  { label: 'SRE', aliases: ['SRE'] },
  { label: 'セキュリティ', aliases: ['セキュリティ'] },
  { label: 'テスト', aliases: ['テスト', 'QA', 'テスト自動化'] },
  { label: 'フロントエンド', aliases: ['フロントエンド', 'React', 'Next.js'] },
  { label: 'TypeScript', aliases: ['TypeScript'] },
  { label: 'Go', aliases: ['Go'] },
  { label: 'Ruby', aliases: ['Ruby', 'Rails'] },
  { label: 'Python', aliases: ['Python'] },
  { label: 'iOS', aliases: ['iOS', 'Swift'] },
  { label: 'Android', aliases: ['Android'] },
  { label: 'データベース', aliases: ['データベース', 'MySQL', 'PostgreSQL'] },
  { label: 'アーキテクチャ', aliases: ['アーキテクチャ', 'マイクロサービス'] },
] as const;

const ALIASES_BY_LABEL = new Map(CURATED_TAGS.map((t) => [t.label, t.aliases]));

/**
 * canonical な ?tag= 値を、突き合わせる生タグ群へ展開する。
 * キュレーション外(任意タグ)の場合はその値自身のみを返す(完全一致フォールバック)。
 */
export function expandTag(label: string): string[] {
  return ALIASES_BY_LABEL.get(label) ?? [label];
}
