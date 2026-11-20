'use client';

import { History, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { ArticleSummaryDto } from '@/features/ai-summary/application/dto';
import type { ArticleCard as ArticleCardType } from '@/features/feed/application/dto';
import { ArticleCard } from '@/features/feed/web/components/article-card';
import { FEED_GAP_CLASS } from '@/features/feed/web/feed-grid-classes';
import { removeReadAction } from '@/features/reads/web/actions';
import { ArticleActions } from './article-actions';
import { groupReadHistory, type ReadHistoryGroup } from './reading-history-groups';
import { RemoveFromHistoryButton } from './remove-from-history-button';
import { SavedSearchInput } from './saved-articles-controls';
import { matchesSavedQuery } from './saved-articles-filter';
import { setGuestSave } from './use-guest-saves';

/**
 * 閲覧履歴(最近読んだ記事)の一覧。ログイン/ゲスト共用のクライアントビュー(ADR-0041)。
 *
 * - articles は読んだ新しい順で受ける。ログイン時は readAtById で JST の日付ごとに見出しを付ける。
 *   ゲストは localStorage に ID しか無く時刻を持たないので、見出し無しの1グループで出す。
 * - カードのアクションは通常フィードと同じ保存トグル + 「閲覧履歴から削除」(= 既読を外す。ADR-0049)。
 *   削除は楽観的に一覧から消し、ログイン時に Server Action が失敗したら戻してトーストを出す。
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
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(() => new Set());
  const visible = articles.filter((a) => !removedIds.has(a.id));
  const filtered = visible.filter((a) =>
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

  function setRemoved(id: string, removed: boolean) {
    setRemovedIds((prev) => {
      const next = new Set(prev);
      if (removed) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function removeFromHistory(article: ArticleCardType) {
    setRemoved(article.id, true);
    if (isGuest) {
      setGuestSave('read', article.id, false);
      toast.success('閲覧履歴から削除しました');
      return;
    }
    void removeReadAction(article.id)
      .catch(() => null)
      .then((result) => {
        if (result?.ok) {
          toast.success('閲覧履歴から削除しました');
          return;
        }
        setRemoved(article.id, false);
        toast.error('閲覧履歴から削除できませんでした');
      });
  }

  const isFiltering = query.trim() !== '';
  const showControls = visible.length > 1 || query !== '';
  const bookmarkedSet = new Set(bookmarkedIds);
  const favoritedSet = new Set(favoritedIds);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="text-fg-muted size-5" />
          <h1 className="text-xl font-bold tracking-tight">閲覧履歴</h1>
        </div>
      </div>
      {showControls && (
        <SavedSearchInput value={query} onChange={setQuery} ariaLabel="閲覧履歴を絞り込む" />
      )}
      {/* 0 件のときは下の空状態が同じことを伝えるので件数(「最近読んだ0件」)は出さない */}
      {visible.length > 0 && (
        <p className={`${showControls ? 'mt-3' : '-mt-2'} text-fg-muted mb-5 text-sm`}>
          {isFiltering
            ? `${filtered.length}件 / 全${visible.length}件`
            : `最近読んだ${visible.length}件`}
        </p>
      )}

      {visible.length === 0 ? (
        // 見た目はフィード・保存一覧の空状態とそろえる(SavedArticlesView と同じ構成)
        <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
          <div className="bg-bg-surface-2 text-fg-muted grid size-16 place-items-center rounded-xl">
            <History className="size-8" />
          </div>
          <p className="text-fg-default mt-5 text-lg font-bold text-balance [word-break:auto-phrase]">
            まだ読んだ記事がありません
          </p>
          <p className="text-fg-muted mt-2 max-w-xs text-sm leading-relaxed text-balance [word-break:auto-phrase]">
            記事ページを開くとここに記録されます
          </p>
          <Button asChild variant="primary" size="md" className="mt-6">
            <Link href="/">フィードを見る</Link>
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
          <div className="bg-bg-surface-2 text-fg-muted grid size-16 place-items-center rounded-xl">
            <Search className="size-8" />
          </div>
          <p className="text-fg-default mt-5 text-lg font-bold text-balance [word-break:auto-phrase]">
            一致する記事がありません
          </p>
          <Button variant="primary" size="md" onClick={() => setQuery('')} className="mt-6">
            絞り込みをクリア
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label || undefined}>
              {group.label && (
                <h2 className="text-fg-muted mb-3 text-sm font-semibold">{group.label}</h2>
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
                        <>
                          <ArticleActions
                            articleId={article.id}
                            initialBookmarked={bookmarkedSet.has(article.id)}
                            initialFavorited={favoritedSet.has(article.id)}
                            isGuest={isGuest}
                          />
                          <RemoveFromHistoryButton onRemove={() => removeFromHistory(article)} />
                        </>
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
