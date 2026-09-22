'use client';

import { ArticleCard } from '@/features/feed/web/components/article-card';
import { FEED_GAP_CLASS } from '@/features/feed/web/feed-grid-classes';
import { ArticleActions } from './article-actions';
import type { ComposedArticle } from './feed-load-more';

/**
 * 企業ページ(/companies/[slug])の記事グリッド。
 * フィードの無限スクロール(FeedList)と違い、初期取得分を静的に並べるだけの軽量版。
 * カード + 保存系アクションの合成は FeedRow と同型(描画を揃える)。
 * 初期 items は RSC(getCompanyArticles)が合成して渡すため SSR / SEO 済み。
 */
export function CompanyArticleGrid({
  items,
  isGuest,
}: {
  items: ComposedArticle[];
  isGuest: boolean;
}) {
  return (
    <div className={`feed-grid ${FEED_GAP_CLASS}`}>
      {items.map(({ article, bookmarked, favorited, summary }) => (
        <ArticleCard
          key={article.id}
          article={article}
          overview={summary?.overview ?? null}
          tags={summary?.tags ?? []}
          actions={
            <ArticleActions
              articleId={article.id}
              initialBookmarked={bookmarked}
              initialFavorited={favorited}
              isGuest={isGuest}
            />
          }
        />
      ))}
    </div>
  );
}
