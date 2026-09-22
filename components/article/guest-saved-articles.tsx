'use client';

import { useEffect, useState } from 'react';
import type { ArticleSummaryDto } from '@/features/ai-summary/application/dto';
import type { ArticleCard } from '@/features/feed/application/dto';
import { getSavedArticleSummaries, getSavedArticles } from './saved-articles-actions';
import { SavedArticlesView } from './saved-articles-view';
import { type GuestSaveKind, readGuestSaves, useGuestSaves } from './use-guest-saves';

/**
 * ゲスト(未ログイン)の保存/お気に入り一覧。
 * localStorage の article ID から getSavedArticles で記事を取得し、SavedArticlesView で描画する。
 * localStorage は追加順(古い順)なので、ログイン時(保存した日の新しい順)と揃うよう逆順で渡す。
 * 保存ボタンの状態・解除 Undo は SavedArticlesView 側が isGuest で localStorage を扱う(ADR-0017)。
 */
export function GuestSavedArticles({ kind }: { kind: Exclude<GuestSaveKind, 'read'> }) {
  const { ready } = useGuestSaves(kind);
  const [articles, setArticles] = useState<ArticleCard[] | null>(null);
  const [summaries, setSummaries] = useState<Record<string, ArticleSummaryDto>>({});

  useEffect(() => {
    if (!ready) return;
    const ids = readGuestSaves(kind).reverse();
    if (ids.length === 0) {
      setArticles([]);
      setSummaries({});
      return;
    }
    let alive = true;
    getSavedArticles(ids).then((result) => {
      if (!alive) return;
      setArticles(result);
      // 実在(削除済み除外)記事の ID で要約を引く。要約は後追いで届いてもカードが ID 引きで拾う。
      getSavedArticleSummaries(result.map((a) => a.id)).then((map) => {
        if (alive) setSummaries(map);
      });
    });
    return () => {
      alive = false;
    };
  }, [ready, kind]);

  if (articles === null) {
    return <div className="h-64 w-full animate-pulse rounded-lg bg-bg-surface-2" />;
  }

  return (
    <SavedArticlesView
      kind={kind}
      articles={articles}
      bookmarkedIds={[]}
      favoritedIds={[]}
      summaries={summaries}
      isGuest
    />
  );
}
