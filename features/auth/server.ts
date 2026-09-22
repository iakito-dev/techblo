import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { auth } from '@/lib/auth';

/**
 * サーバー側のセッション取得。Server Component / Server Action から呼ぶ。
 * 未認証なら null を返す(閲覧は未ログインでも可能なため throw しない)。
 *
 * React `cache()` でリクエスト内デデュープする。1画面の描画で getSession() は複数の
 * 独立した Suspense 境界から呼ばれる(例: トップは SubscribedFeed・FeedToolbar・MobileToolbar が
 * それぞれ getFeedPageData / getFeedFilterCompanies 経由で呼ぶ)。境界が別だと 'use cache' のような
 * 自然な重複排除が効かず、毎回 await headers() + 署名 Cookie(cookieCache)の検証が走っていた。
 * cache() で同一リクエスト内は1回に畳む(DB 往復は cookieCache が、リクエスト内重複はこれが潰す)。
 * 詳細仕様: docs/features/auth.md
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/**
 * 認証必須の処理で使う。未認証なら redirectTo へリダイレクト(以降の行は実行されない)。
 * 個人化機能の Server Component / Action 冒頭で呼ぶ想定。
 * 新規ユーザーが多い保護ページからは `/signup?callbackURL=...` を渡して新規登録を優先しつつ
 * ログイン後に元のページへ戻す(callbackURL は同一オリジンの相対パスのみ渡すこと)。
 */
export async function requireSession(redirectTo = '/login') {
  const session = await getSession();
  if (!session) redirect(redirectTo);
  return session;
}
