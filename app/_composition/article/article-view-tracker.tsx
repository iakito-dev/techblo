'use client';

import { useEffect, useRef } from 'react';
import { useSession } from '@/features/auth/client';
import { trackArticleView } from '@/features/feed/web/actions';
import { markArticleRead } from './mark-article-read';

/**
 * 記事ページ(/a/[id])に着地したときの計測と既読マーク。表示するものは無い。
 *
 * 以前はカードのクリックハンドラ(ダイアログ起動時)で呼んでいたが、詳細をページ遷移に
 * 変えたため着地側へ移した。クリック直後に Server Action を投げると遷移でリクエストが
 * 中断されうるのに対し、着地後なら確実に届く。
 *
 * 表示回数と既読でセッションへの依存を分ける:
 * - 表示回数は未ログインでも加算する(docs/features/feed.md)ので、セッションを待たずに投げる。
 *   待たせると、セッション取得が遅い/失敗した端末で計測ごと落ちる。
 * - 既読は保存先がログイン=DB / ゲスト=localStorage と分かれる(ADR-0017 / ADR-0021)ため、
 *   セッションの解決を待つ。取得に失敗したときも isPending は落ちて data=null になるので
 *   ゲストとして localStorage に置く(取りこぼすより手元に残す。ログイン時に
 *   GuestSavesMigrator が DB へマージする)。
 *
 * ゲスト判定をサーバーではなくクライアントの useSession() で行うのは、ページ本体を
 * ユーザー非依存に保って静的シェルのまま prefetch できるようにするため(session を読むと
 * ページが動的になる)。StrictMode の二重実行と再描画による重複実行は ref で1回に抑える。
 */
export function ArticleViewTracker({ articleId }: { articleId: string }) {
  const { data: session, isPending } = useSession();
  const viewedId = useRef<string | null>(null);
  const readId = useRef<string | null>(null);

  useEffect(() => {
    if (viewedId.current === articleId) return;
    viewedId.current = articleId;
    // 失敗は Action 側でログ。計測が落ちても画面には影響させない。
    void trackArticleView({ articleId });
  }, [articleId]);

  useEffect(() => {
    // 解決前に走らせるとログイン済みでもゲスト扱いで localStorage に書いてしまう。
    if (isPending || readId.current === articleId) return;
    readId.current = articleId;
    markArticleRead(articleId, !session);
  }, [articleId, isPending, session]);

  return null;
}
