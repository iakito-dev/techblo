'use client';

import { History, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { ArticleSummaryDto } from '@/features/ai-summary/application/dto';
import type { ArticleCard as ArticleCardType } from '@/features/feed/application/dto';
import { ArticleCard } from '@/features/feed/web/components/article-card';
import { FEED_GAP_CLASS } from '@/features/feed/web/feed-grid-classes';
import { ArticleActions } from './article-actions';
import { groupReadHistory, type ReadHistoryGroup } from './reading-history-groups';
import { SavedSearchInput } from './saved-articles-controls';
import { matchesSavedQuery } from './saved-articles-filter';

/**
 * 閲覧履歴(最近読んだ記事)の一覧。ログイン/ゲスト共用のクライアントビュー(ADR-0041)。
 *
 * - articles は読んだ新しい順で受ける。ログイン時は readAtById で JST の日付ごとに見出しを付ける。
 *   ゲストは localStorage に ID しか無く時刻を持たないので、見出し無しの1グループで出す。
 * - 既読は外す操作が無い(ADR-0021)ので、カードのアクションは通常フィードと同じ保存トグルだけ。
 * - 絞り込みは保存一覧と同じ語の AND 一致(saved-articles-filter)をクライアントで行う。
 */
export function ReadingHistoryView({
  articles,
  readAtById,
  bookmarkedIds,
  favoritedIds,
  summaries = {},
  isGuest = false,
}: {
  articles: ArticleCardType[];
  /** 記事 ID → 最後に読んだ時刻(ISO)。ゲストは undefined。 */
  readAtById?: Record<string, string>;
  bookmarkedIds: string[];
  favoritedIds: string[];
  summaries?: Record<string, ArticleSummaryDto>;
  isGuest?: boolean;
}) {
  const [query, setQuery] = useState('');
  const filtered = articles.filter((a) =>
    matchesSavedQuery(
      {
        title: a.title,
        companyName: a.company.name,
        publishedAt: new Date(a.publishedAt),
        overview: summaries[a.id]?.overview,
        tags: summaries[a.id]?.tags,
      },
      query,
    ),
  );
  const groups: ReadHistoryGroup<ArticleCardType>[] = readAtById
    ? groupReadHistory(filtered, (a) => new Date(readAtById[a.id] ?? 0), new Date())
    : [{ key: 'all', label: '', items: filtered }];

  const isFiltering = query.trim() !== '';
  const showControls = articles.length > 1 || query !== '';
  const bookmarkedSet = new Set(bookmarkedIds);
  const favoritedSet = new Set(favoritedIds);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="size-5 text-fg-muted" />
          <h1 className="font-bold text-xl tracking-tight">閲覧履歴</h1>
        </div>
      </div>
      {showControls && (
        <SavedSearchInput value={query} onChange={setQuery} ariaLabel="閲覧履歴を絞り込む" />
      )}
      <p className={`${showControls ? 'mt-3' : '-mt-2'} mb-5 text-fg-muted text-sm`}>
        {isFiltering
          ? `${filtered.length}件 / 全${articles.length}件`
          : `最近読んだ${articles.length}件`}
      </p>

      {articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
          <History className="size-10 text-fg-subtle" />
          <p className="mt-4 font-bold text-fg-default">まだ読んだ記事がありません</p>
          <p className="mt-1 text-fg-muted text-sm">記事ページを開くとここに記録されます</p>
          <Link href="/" className="mt-4 font-medium text-accent text-sm hover:underline">
            フィードを見る
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <Search className="size-10 text-fg-subtle" />
          <p className="mt-4 font-bold text-fg-default">一致する記事がありません</p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="mt-3 rounded-sm font-medium text-accent text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            絞り込みをクリア
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label || undefined}>
              {group.label && (
                <h2 className="mb-3 font-semibold text-fg-muted text-sm">{group.label}</h2>
              )}
              <div className={`feed-grid ${FEED_GAP_CLASS}`}>
                {group.items.map((article) => {
                  const summary = summaries[article.id];
                  return (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      overview={summary?.overview ?? null}
                      tags={summary?.tags ?? []}
                      actions={
                        <ArticleActions
                          articleId={article.id}
                          initialBookmarked={bookmarkedSet.has(article.id)}
                          initialFavorited={favoritedSet.has(article.id)}
                          isGuest={isGuest}
                        />
                      }
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
