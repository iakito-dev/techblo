'use client';

import { useEffect } from 'react';
import { captureEvent, identifyUser, resetUser } from '@/lib/observability/posthog';
import { useSession } from '../client';
import { isNewlyCreatedUser, takePendingLogin } from '../pending-login';

/**
 * セッションと PostHog の distinct_id を同期する(描画するものは無い)。
 * - ログイン中: Better Auth のユーザー id で identify。メール・名前は送らない
 * - 未ログイン: 識別済みなら reset。ログアウト操作に限らず、セッション切れで戻った再訪も
 *   匿名に戻すため、signOut の呼び出し側ではなくセッションの状態から判定する
 * - ログインボタン押下の目印(pending-login)が残っていれば認証完了として login_succeeded を送る
 *
 * isPending 中は判定しない(解決前は data=null なので、ログイン済みでも reset してしまう)。
 */
export function AnalyticsIdentity() {
  const { data: session, isPending } = useSession();
  const userId = session?.user.id ?? null;
  const createdAt = session?.user.createdAt ?? null;

  useEffect(() => {
    if (isPending) return;
    if (!userId) {
      resetUser();
      return;
    }
    identifyUser(userId);
    const provider = takePendingLogin();
    if (provider && createdAt) {
      captureEvent('login_succeeded', { provider, isNewUser: isNewlyCreatedUser(createdAt) });
    }
  }, [isPending, userId, createdAt]);

  return null;
}
