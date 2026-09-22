import Link from 'next/link';
import type { ReactNode } from 'react';
import { FEED_COLUMNS_DISPLAY_CLASS, feedCutoffClass } from '@/features/feed/web/feed-grid-classes';
import { MOBILE_GUTTER_CLASS } from '@/shared/layout';

/**
 * セクション型フィードの棚1つ(見出し + もっと見る + カードのグリッド/横スクロール)。
 * カード描画は feature 境界を越えないよう render prop(renderItem)で app 層から注入する
 * (feed は bookmarks/favorites/ai-summary を import しないため。ADR-0013 と同じ考え方)。
 *
 * モバイル(<md)は棚ごとに横スクロール(scroll-snap)、md+ はコンテナクエリ(FEED_COLUMNS_DISPLAY_CLASS)で
 * コンテンツ領域の実幅に応じて1〜4列に可変のグリッドへ切り替わる(ADR-0035)。ビューポートでは
 * なく祖先の `@container`(page.tsx の本文ラッパー)が測る実幅で決まるため、サイドバー等の
 * 有無で列数が変わっても正しく追従する。
 *
 * サーバは列数(=実質ビューポート)を知らないため、呼び出し側(feed-sections-view.tsx)は常に
 * 最大件数(新着 LATEST_COUNT・棚 SHELF_ITEM_COUNT)ぶんの items を渡し、実列数に満たない分は
 * ここで `cutoff`(feedCutoffClass)により CSS 側から隠す。
 */
export function FeedSection<T>({
  headingId,
  title,
  moreHref,
  moreText = 'もっと見る',
  moreLabel,
  items,
  cutoff,
  getKey,
  renderItem,
}: {
  headingId: string;
  title: string;
  /** 「もっと見る」リンクの遷移先。未指定なら表示しない。 */
  moreHref?: string;
  moreText?: string;
  /** 「もっと見る」の意味の分かるアクセシブルネーム(例: 「AI・機械学習をもっと見る」)。 */
  moreLabel?: string;
  items: T[];
  /** 実列数に満たない分を隠す CSS ユーティリティ(新着=3行分/棚=2行分)。ADR-0035。 */
  cutoff: 'latest' | 'shelf';
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
}) {
  const cutoffClass = feedCutoffClass(cutoff);
  return (
    <section aria-labelledby={headingId} className="py-8 first:pt-0 md:py-10">
      <div className={`mb-6 flex items-end gap-4 ${MOBILE_GUTTER_CLASS} md:px-0`}>
        <h2
          id={headingId}
          className="relative pb-3 font-bold text-[26px] text-fg-default leading-tight tracking-tight after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-14 after:rounded-full after:bg-accent"
        >
          {title}
        </h2>
        {moreHref && (
          <Link
            href={moreHref}
            aria-label={moreLabel}
            className="ml-auto shrink-0 whitespace-nowrap pb-3.5 font-semibold text-fg-default text-sm after:content-['_→']"
          >
            {moreText}
          </Link>
        )}
      </div>
      <div
        className={`scrollbar-none ${FEED_COLUMNS_DISPLAY_CLASS} flex snap-x snap-mandatory gap-4 overflow-x-auto ${MOBILE_GUTTER_CLASS} pb-1 md:snap-none md:gap-x-8 md:gap-y-10 md:overflow-visible md:px-0 md:pb-0 ${cutoffClass}`}
      >
        {items.map((item) => (
          <div key={getKey(item)} className="w-[290px] shrink-0 snap-start md:w-auto md:shrink">
            {renderItem(item)}
          </div>
        ))}
      </div>
    </section>
  );
}
