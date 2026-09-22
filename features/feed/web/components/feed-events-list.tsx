import Link from 'next/link';
import type { ReactNode } from 'react';
import { MOBILE_GUTTER_CLASS } from '@/shared/layout';

/**
 * イベント・コミュニティの1行リスト(棚のカードグリッドにはしない。ADR-0034: 1本あたりの読む価値が他カテゴリより低く鮮度が命のため、他の技術棚と同じ3本カードで
 * 並べると新着に近い技術記事を押しのけてしまう)。
 * 行の描画は feature 境界を越えないよう render prop(renderRow)で app 層から注入する。
 */
export function FeedEventsList<T>({
  headingId,
  moreHref,
  items,
  getKey,
  renderRow,
}: {
  headingId: string;
  moreHref: string;
  items: T[];
  getKey: (item: T) => string;
  renderRow: (item: T) => ReactNode;
}) {
  return (
    <section aria-labelledby={headingId} className="py-8 md:py-10">
      <div className={`mb-4 flex items-end gap-4 ${MOBILE_GUTTER_CLASS} md:px-0`}>
        <h2
          id={headingId}
          className="relative pb-3 font-bold text-[26px] text-fg-default leading-tight tracking-tight after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-14 after:rounded-full after:bg-accent"
        >
          イベント・コミュニティ
        </h2>
        <Link
          href={moreHref}
          aria-label="イベント・コミュニティをすべて見る"
          className="ml-auto shrink-0 whitespace-nowrap pb-3.5 font-semibold text-fg-default text-sm after:content-['_→']"
        >
          すべて見る
        </Link>
      </div>
      <div className={`border-border-default border-t-[1.5px] ${MOBILE_GUTTER_CLASS} md:px-0`}>
        {items.map((item) => (
          <div key={getKey(item)} className="border-border-default border-b last:border-b-0">
            {renderRow(item)}
          </div>
        ))}
      </div>
    </section>
  );
}
