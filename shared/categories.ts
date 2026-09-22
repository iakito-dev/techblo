import { z } from 'zod';

/**
 * 記事カテゴリ(職能軸)の定義(ADR-0034)。単一の真実の源(ADR-0034)。
 *
 * 軸は「その記事は会社の中のどの職能領域(チーム)の仕事の話か」。1記事は必ず1カテゴリにのみ所属する。
 * `event` だけは棚(フィード上のセクション)ではなく、ページ下部のリスト表示に使う(§7参照)。
 *
 * I/O を持たない純粋な定数 + Zod なので `shared/` に置く。domain 層は `lib/` を import できない
 * (depcruise `domain-no-io`)が `shared/` は import できるため、ここに置くことで
 * `features/ai-summary/domain` と将来の `features/feed`(棚の表示)の両方が同じ定義を参照でき、
 * カテゴリ定義の二重管理を避けられる。
 */
export const articleCategorySchema = z.enum([
  'ai',
  'infra',
  'devex',
  'app',
  'security',
  'org',
  'event',
]);

export type ArticleCategory = z.infer<typeof articleCategorySchema>;

export type CategoryDefinition = {
  key: ArticleCategory;
  /** 表示名。 */
  label: string;
  /** 1行の定義(判断基準の要約)。 */
  description: string;
  /** フィード上の棚として表示するか。event のみ false(ページ下部のリスト用)。 */
  isShelf: boolean;
};

/**
 * 棚の並び順(ADR-0034)。
 * event はここに含めない(isShelf=false で別枠表示のため)。
 */
export const CATEGORY_DEFINITIONS: readonly CategoryDefinition[] = [
  {
    key: 'ai',
    label: 'AI・機械学習',
    description:
      'LLM/エージェント/MLモデル/検索・推薦/データ基盤・統計を作る・評価する・導入する話',
    isShelf: true,
  },
  {
    key: 'infra',
    label: 'クラウド・インフラ',
    description:
      'クラウドサービス・ネットワーク・Kubernetes・IaC・監視・DB運用など、システムを動かす基盤の話',
    isShelf: true,
  },
  {
    key: 'devex',
    label: '開発生産性',
    description:
      'コードを書く・テストする・届ける「やり方」の話。コーディングエージェントの使い方、CI/CD、QA、開発環境',
    isShelf: true,
  },
  {
    key: 'app',
    label: 'アプリケーション開発',
    description:
      'バックエンド・フロントエンド・モバイルのプロダクトコード(言語・フレームワーク・API・設計)の話',
    isShelf: true,
  },
  {
    key: 'security',
    label: 'セキュリティ',
    description: '認証認可・脆弱性・脅威・攻撃対策・セキュリティガバナンスの話',
    isShelf: true,
  },
  {
    key: 'org',
    label: 'プロダクト・組織・キャリア',
    description:
      '人・チーム・仕事の進め方・プロダクト戦略・UX/デザイン・採用・キャリアの話(技術は背景)',
    isShelf: true,
  },
  {
    key: 'event',
    label: 'イベント・コミュニティ',
    description:
      'カンファレンス協賛/登壇/参加レポート・イベント予定・勉強会開催報告(技術広報の仕事)',
    isShelf: false,
  },
] as const;

const DEFINITION_BY_KEY = new Map(CATEGORY_DEFINITIONS.map((d) => [d.key, d]));

export function getCategoryDefinition(key: ArticleCategory): CategoryDefinition {
  const def = DEFINITION_BY_KEY.get(key);
  if (!def) throw new Error(`unknown category: ${key}`);
  return def;
}

/** 棚として表示するカテゴリのみ、並び順どおりに返す。 */
export const SHELF_CATEGORIES: readonly ArticleCategory[] = CATEGORY_DEFINITIONS.filter(
  (d) => d.isShelf,
).map((d) => d.key);
