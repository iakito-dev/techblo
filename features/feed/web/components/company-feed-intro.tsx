import { ExternalLink, Rss } from 'lucide-react';
import type { CompanyFeedIntroView } from '@/features/feed/web/view-models/company-feed-intro';

const LINK_CLASS =
  'text-fg-secondary hover:text-accent focus-visible:ring-accent inline-flex min-h-11 items-center gap-1 rounded-sm underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:outline-none';

/**
 * 企業で絞ったフィード(/?company=<slug>)の見出し下に出す紹介行。
 * 企業ページ廃止(ADR-0048)で企業の紹介文・公式ブログ・企業別 RSS への導線がどこにも無くなっていたため、
 * 絞り込み一覧そのものに置く。モバイルは見出し行(lg+ のみ)が無いので、全幅で同じ行を出す。
 */
export function CompanyFeedIntro({ view }: { view: CompanyFeedIntroView }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 text-sm lg:-mt-2 lg:mb-6">
      {view.description && (
        <p className="text-fg-muted basis-full lg:basis-auto">{view.description}</p>
      )}
      {view.siteUrl && view.siteHost && (
        <a href={view.siteUrl} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          {view.siteHost}
          <ExternalLink aria-hidden="true" className="size-3.5" />
          <span className="sr-only">(公式ブログを新しいタブで開く)</span>
        </a>
      )}
      <a href={view.rssPath} className={LINK_CLASS}>
        <Rss aria-hidden="true" className="size-3.5" />
        RSS
      </a>
    </div>
  );
}
