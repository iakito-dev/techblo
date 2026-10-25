'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { type ArticleClickSource, captureEvent } from '@/lib/observability/posthog';
import type { ArticleCard } from '../../application/dto';
import { ARTICLE_LINK_PREFETCH } from '../article-link-prefetch';

type TrackedArticle = Pick<ArticleCard, 'id'> & {
  company: Pick<ArticleCard['company'], 'id' | 'slug'>;
};

/**
 * 記事ページ(/a/[id])へのリンク。クリックを article_clicked として計測する
 * (どの記事・企業が、どの導線から読まれているか)。先読み指定は ARTICLE_LINK_PREFETCH を常に付ける。
 * 着地ページ側の閲覧は posthog の $pageview で取れるので、ここは「押した場所」の情報を足す役割。
 */
export function ArticleLink({
  article,
  source,
  onClick,
  ...props
}: Omit<ComponentProps<typeof Link>, 'href'> & {
  article: TrackedArticle;
  source: ArticleClickSource;
}) {
  return (
    <Link
      href={`/a/${article.id}`}
      {...ARTICLE_LINK_PREFETCH}
      {...props}
      onClick={(e) => {
        captureEvent('article_clicked', {
          articleId: article.id,
          companyId: article.company.id,
          companySlug: article.company.slug,
          source,
        });
        onClick?.(e);
      }}
    />
  );
}

/**
 * 記事ページの「元記事を開く」(外部サイトへの出口)。実際に本文を読みに行った数として
 * article_source_opened を計測する。新規タブで開くので計測が遷移で落ちることはない。
 */
export function ArticleSourceLink({
  article,
  ...props
}: Omit<ComponentProps<'a'>, 'href' | 'target' | 'rel' | 'onClick'> & {
  article: TrackedArticle & Pick<ArticleCard, 'url'>;
}) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
      onClick={() =>
        captureEvent('article_source_opened', {
          articleId: article.id,
          companyId: article.company.id,
          companySlug: article.company.slug,
        })
      }
    />
  );
}
