'use client';

import Link from 'next/link';
import { RelativeTime } from '@/features/feed/web/components/relative-time';
import type { ComposedArticle } from './feed-load-more';

/**
 * イベント・コミュニティの1行(日付 + タイトル + 企業名)。見た目は棚のカードと違う軽量な
 * リスト行だが、クリック時の遷移先は ArticleCard と同じ記事ページ(/a/[id])に揃える
 * (ADR-0036。表示回数計測と既読マークは着地したページ側で行う)。
 */
export function FeedEventRow({ item }: { item: ComposedArticle }) {
  const { article } = item;

  return (
    <div
      data-article-card
      data-article-url={article.url}
      className="flex items-baseline gap-4 py-3 text-sm"
    >
      <RelativeTime date={article.publishedAt} className="w-14 shrink-0 text-fg-muted text-xs" />
      {/* ArticleCard のタイトルリンクと同じ遷移先(記事ページ)。 */}
      <Link
        href={`/a/${article.id}`}
        data-article-link
        className="min-w-0 flex-1 truncate font-medium text-fg-default transition-colors hover:text-accent"
      >
        {article.title}
      </Link>
      <span className="shrink-0 text-fg-muted text-xs">{article.company.name}</span>
    </div>
  );
}
