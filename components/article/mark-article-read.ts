'use client';

import { markReadAction } from '@/features/reads/web/actions';
import { addGuestSave } from './use-guest-saves';

/**
 * 記事を開いた時の既読マーク(ログイン=DB / ゲスト=localStorage・ADR-0021 / ADR-0017)。
 *
 * 以前はカード/イベント行のダイアログ起動時に呼んでいたが、記事詳細をページ遷移
 * (/a/[id])にしたため、着地したページ側(ArticleViewTracker)から呼ぶ。
 * feed-list.tsx(一覧の重いクライアントモジュール)から切り出しているのは、
 * 記事ページがこの関数のためだけに一覧のバンドルを読み込まないようにするため。
 */
export function markArticleRead(articleId: string, isGuest: boolean): void {
  if (isGuest) addGuestSave('read', articleId);
  else void markReadAction(articleId);
}
