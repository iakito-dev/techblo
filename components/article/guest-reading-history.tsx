'use client';

import { useEffect, useState } from 'react';
import type { ArticleSummaryDto } from '@/features/ai-summary/application/dto';
import type { ArticleCard } from '@/features/feed/application/dto';
import { ReadingHistoryView } from './reading-history-view';
import { getSavedArticleSummaries, getSavedArticles } from './saved-articles-actions';
import { readGuestSaves, useGuestSaves } from './use-guest-saves';

/** ログイン時の READ_HISTORY_LIMIT と揃える(feature の定数は components から引かない)。 */
const GUEST_HISTORY_LIMIT = 100;

/**
 * ゲスト(未ログイン)の閲覧履歴。localStorage の既読 ID(末尾 = 最後に開いた記事)から
 * 直近分を新しい順に取り、ReadingHistoryView で描画する(ADR-0017 / ADR-0041)。
 */
export function GuestReadingHistory() {
  const { ready } = useGuestSaves('read');
  const [articles, setArticles] = useState<ArticleCard[] | null>(null);
  const [summaries, setSummaries] = useState<Record<string, ArticleSummaryDto>>({});

  useEffect(() => {
    if (!ready) return;
    const ids = readGuestSaves('read').slice(-GUEST_HISTORY_LIMIT).reverse();
    if (ids.length === 0) {
      setArticles([]);
      return;
    }
    let alive = true;
    getSavedArticles(ids).then((result) => {
      if (!alive) return;
      setArticles(result);
      getSavedArticleSummaries(result.map((a) => a.id)).then((map) => {
        if (alive) setSummaries(map);
      });
    });
    return () => {
      alive = false;
    };
  }, [ready]);

  if (articles === null) {
    return <div className="h-64 w-full animate-pulse rounded-lg bg-bg-surface-2" />;
  }

  return (
    <ReadingHistoryView
      articles={articles}
      bookmarkedIds={[]}
      favoritedIds={[]}
      summaries={summaries}
      isGuest
    />
  );
}
