import { Bookmark, Flame, Heart } from 'lucide-react';
import { cn } from '@/shared/utils';

/**
 * ランディングページ用の faux(ダミー)UI 部品。
 *
 * 法務方針: プロダクトの見た目を再現するモックでは、各社のロゴ/ファビコンを一切表示せず、
 * 社名も架空の一般名(Tech Blog A 等)にする。実在企業のロゴ表示は商標・著作権リスクがあり、
 * 掲載許可も得ていないため(design.md 原則7)。実社名を出すのは「対応企業」一覧のみ
 * (テキストの記述的言及 + フッター免責)に限定する。
 *
 * 実データには触れず、実カードと同じトークン(はてブ Flame バッジ・shadow-card)で
 * 見た目だけを再現する。LP は features 層を経由しない(ADR-0010 の境界を跨がない)。
 */

/**
 * 「対応企業」一覧で表示する実社名(テキストのみ)。集約対象を事実として記述的に挙げる。
 * ロゴは出さない。無関係である旨はフッター免責で明示する。
 */
export const LP_COMPANIES = [
  'LINEヤフー',
  'mercari',
  'LayerX',
  'DeNA',
  'CyberAgent',
  'SmartHR',
  'freee',
  'マネーフォワード',
  'Sansan',
  'ZOZO',
  'クックパッド',
  'エムスリー',
  'タイミー',
  'カミナシ',
  'Findy',
  'Cybozu',
  'Ubie',
  'BASE',
  'CADDi',
  'ANDPAD',
  'Serverworks',
  'さくらインターネット',
  'Goodpatch',
  'newmo',
  'エウレカ',
  'e-dash',
] as const;

export type FauxArticle = {
  /** 架空の一般名(実在企業ではない)。 */
  company: string;
  /** 中立な頭文字タイルに出す 1 文字(ロゴではない)。 */
  glyph: string;
  title: string;
  excerpt: string;
  time: string;
  hatena: number;
};

/**
 * ヒーロー/機能行で使う faux 記事。社名・記事ともに架空(実在のものではない)。
 * 実在企業に架空記事を紐付けない(誤帰属・なりすまし回避)。
 */
export const FAUX_ARTICLES: FauxArticle[] = [
  {
    company: 'Meteora Tech',
    glyph: 'M',
    title: '大規模 Kafka クラスタの運用知見とコスト最適化',
    excerpt: 'スループットを保ちつつ月額を 3 割削減した構成変更の記録。',
    time: '2時間前',
    hatena: 248,
  },
  {
    company: 'Hatchworks',
    glyph: 'H',
    title: 'マイクロサービスのオブザーバビリティ基盤を刷新した話',
    excerpt: 'トレースとメトリクスを一本化し、障害の一次切り分けを高速化。',
    time: '5時間前',
    hatena: 412,
  },
  {
    company: 'Cobalt Lab',
    glyph: 'C',
    title: '型安全なフォーム設計で実装ミスを根絶する',
    excerpt: 'スキーマ駆動でバリデーションと型を一致させる設計パターン。',
    time: '昨日',
    hatena: 173,
  },
  {
    company: 'Pinegrove',
    glyph: 'P',
    title: 'Go の pprof でメモリリークを最後まで追い切る',
    excerpt: 'プロファイルの読み方と、見落としがちな割り当て元の特定手順。',
    time: '昨日',
    hatena: 96,
  },
  {
    company: 'Driftstack',
    glyph: 'D',
    title: 'AWS コストの可視化を内製ダッシュボードで実現',
    excerpt: 'タグ設計から始める、チームに刺さるコスト見える化の進め方。',
    time: '2日前',
    hatena: 64,
  },
  {
    company: 'Tidewave',
    glyph: 'T',
    title: '検索基盤のベクトル化で関連度を改善した取り組み',
    excerpt: '既存の全文検索にセマンティック検索を段階導入した設計判断。',
    time: '3日前',
    hatena: 131,
  },
];

/** 購読フィルタのモックで使う架空フィード(実社名ではない)。 */
export const FAUX_FEEDS = FAUX_ARTICLES.slice(0, 5).map((a) => ({
  name: a.company,
  glyph: a.glyph,
}));

/**
 * 企業を表す中立な頭文字タイル(ロゴではない)。実カードのファビコン枠と同寸・同トーンにし、
 * ロゴを出さずにプロダクトの密度感だけ再現する。
 */
export function CompanyGlyph({ label, className }: { label: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-4 shrink-0 place-items-center rounded-sm bg-bg-surface-2 font-semibold text-[0.5625rem] text-fg-muted ring-1 ring-border-card',
        className,
      )}
    >
      {label}
    </span>
  );
}

/** はてブ数の指標バッジ(実カードと同じ Flame 表現)。 */
function HatenaBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-fg-secondary text-xs tabular-nums">
      <Flame aria-hidden="true" fill="currentColor" className="size-3.5 text-[#ea580c]" />
      {count}
    </span>
  );
}

/** faux 記事カード(テキスト主体・実カードの縮約)。 */
export function FauxArticleCard({
  article,
  className,
}: {
  article: FauxArticle;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2.5 rounded-xl border border-border-card bg-bg-surface p-4 shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-card-hover',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-[0.6875rem] leading-tight">
        <CompanyGlyph label={article.glyph} />
        <span className="truncate font-medium text-fg-muted tracking-wide">{article.company}</span>
        <span className="text-fg-faint">·</span>
        <span className="shrink-0 text-fg-faint">{article.time}</span>
        <span className="ml-auto">
          <HatenaBadge count={article.hatena} />
        </span>
      </div>
      <h3 className="font-bold text-[0.9375rem] text-fg-default leading-snug tracking-tight">
        {article.title}
      </h3>
      <p className="line-clamp-2 text-fg-muted text-xs leading-relaxed">{article.excerpt}</p>
      <div className="mt-1 flex items-center gap-1.5 text-fg-faint">
        <span className="grid size-7 place-items-center rounded-md border border-border-default">
          <Bookmark className="size-3.5" />
        </span>
        <span className="grid size-7 place-items-center rounded-md border border-border-default">
          <Heart className="size-3.5" />
        </span>
      </div>
    </div>
  );
}
