import {
  FEED_COLUMNS_CLASS,
  FEED_FIRST_RULE_CLASS,
  FEED_GAP_CLASS,
} from '@/features/feed/web/feed-grid-classes';

/**
 * フィードのローディング skeleton。Suspense fallback で使う。
 * 一覧本体は app 層の合成(components/article/feed-load-more + feed-list)で描画する(ADR-0013)。
 * NOTE: 旧 FeedGrid 本体は「もっと読む」化で廃止(skeleton のみ残す)。
 *
 * count は描画する枚数。少ないとリロード毎に skeleton→実カードでページが伸びてガタつくため、
 * フィードは初期取得件数(INITIAL_PAGE_SIZE=24)に合わせる。保存記事ページは件数が可変なので既定の 12。
 *
 * variant: 'auto'(既定)は企業ページ・保存記事ページと同じ auto-fill の feed-grid ユーティリティ
 * (変更対象外)。'columns' はトップ(`/`)の一覧のみで使う、コンテナクエリで1〜4列に可変の
 * FEED_COLUMNS_CLASS(ADR-0035)。祖先に `@container` が無いと単なる1列グリッドになる。
 */
export function FeedGridSkeleton({
  count = 12,
  variant = 'auto',
}: {
  count?: number;
  variant?: 'auto' | 'columns';
} = {}) {
  return (
    <div
      className={
        variant === 'columns'
          ? `grid grid-cols-1 ${FEED_GAP_CLASS} ${FEED_COLUMNS_CLASS} ${FEED_FIRST_RULE_CLASS}`
          : `feed-grid ${FEED_GAP_CLASS}`
      }
    >
      {Array.from({ length: count }, (_, i) => i).map((i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * 記事カード1枚ぶんの skeleton(一覧・棚・保存記事で共有)。
 *
 * 骨格(1.5px の上罫・pt-4・行間)も罫線の色(`border-border-default`)も実カード
 * (article-card.tsx)と同じにする。以前は実カードの上罫が ink(本文と同じ濃さ)で、
 * 同じ濃さの罫を skeleton にも引くと「濃い線が何本も走るだけ」の画面になっていたため
 * 1 段薄い `border-border-strong` にしていたが、実カード側を hairline まで落としたので
 * その差は不要になった(逆に skeleton の方が濃くなってしまう)。
 *
 * パルスは各ブロックではなくカード単位で掛ける。罫線も一緒に呼吸し、カード1枚が
 * 1つの塊として読める(アニメーションも 1 枚あたり 4 個 → 1 個になる)。
 *
 * プレースホルダの面は `bg-bg-surface-3`(#e7e5e0)。`bg-bg-surface-2`(#f4f3f0)は
 * 地色(#fafaf8)との差が 2% 程度でほぼ見えず、中身がほぼ見えないのに罫だけが見える
 * コントラストの逆転を招いていた。罫と面を同じグレーの階調にそろえ、カード全体が
 * 1 つの淡い塊として読めるようにする。
 */
export function ArticleCardSkeleton({ withExcerpt = true }: { withExcerpt?: boolean }) {
  return (
    <div className="flex animate-pulse flex-col gap-2.5 border-border-default border-t-[1.5px] pt-4">
      <div className="h-3 w-28 rounded bg-bg-surface-3" />
      <div className="h-5 w-full rounded bg-bg-surface-3" />
      <div className="h-4 w-4/5 rounded bg-bg-surface-3" />
      {withExcerpt && <div className="mt-2 h-8 w-full rounded bg-bg-surface-3" />}
    </div>
  );
}
