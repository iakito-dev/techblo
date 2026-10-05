import Link from 'next/link';
import { CompanyFavicon } from '@/components/article/company-favicon';
import { formatRelative } from '@/shared/date';
import type { ArticleCard } from '../../application/dto';

/**
 * 記事ページ下部の関連記事(ADR-0037)。記事ページと同じ「面・影・角丸なし、hairline の罫」の
 * 声色で、行全体を1本のリンクにした静かなリストにする(ADR-0035)。
 * 相対日時はサーバーで描画する Server Component のため RelativeTime(client)は使わない。
 */
export function RelatedArticles({ articles }: { articles: ArticleCard[] }) {
  if (articles.length === 0) return null;

  return (
    <section aria-labelledby="related-articles-heading" className="mt-10 xl:mt-8">
      <h2
        id="related-articles-heading"
        className="mb-1 font-bold text-base text-fg-default tracking-[-0.015em]"
      >
        関連記事
      </h2>
      <ul className="border-border-default border-t-[1.5px]">
        {articles.map((article) => (
          <li key={article.id} className="border-border-default border-b">
            <Link
              href={`/a/${article.id}`}
              className="group flex min-h-11 touch-manipulation flex-col gap-1.5 py-3.5 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 xl:py-3"
            >
              <span className="flex items-center gap-[7px] font-semibold text-[11.5px] text-fg-default">
                <CompanyFavicon url={article.url} name={article.company.name} size={20} />
                <span className="min-w-0 truncate">{article.company.name}</span>
                <span className="ml-auto shrink-0 font-normal text-fg-muted">
                  {formatRelative(article.publishedAt)}
                </span>
              </span>
              <span className="line-clamp-2 font-bold text-[0.9375rem] text-fg-default leading-[1.5] tracking-[-0.015em] transition-colors group-hover:text-accent xl:text-sm">
                {article.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
