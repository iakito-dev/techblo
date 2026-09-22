import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db/client';
import { account, session, user, verification } from '@/db/schema/auth';
import { env } from './env';
import { initializeUserSubscriptions } from './initialize-user-subscriptions';
import { logger } from './observability/logger';

/**
 * Better Auth インスタンス。
 *
 * セットアップ手順(各プロバイダの OAuth アプリを作成し client id/secret を .env.local へ):
 * 1. Google Cloud Console
 *    - Authorized redirect URI: {BETTER_AUTH_URL}/api/auth/callback/google
 *    - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 * 2. GitHub Developer settings → OAuth Apps
 *    - Authorization callback URL: {BETTER_AUTH_URL}/api/auth/callback/github
 *    - GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
 * 3. Discord Developer Portal → Applications → OAuth2
 *    - Redirect: {BETTER_AUTH_URL}/api/auth/callback/discord
 *    - DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET
 * 4. BETTER_AUTH_SECRET に 32+ 文字のランダム文字列を設定
 *
 * 同一の確認済みメールを持つアカウントは Better Auth 既定の account linking で
 * 自動的に同一ユーザーへ束ねられる(Google/GitHub/Discord はいずれも検証済みメールを返す)。
 *
 * 詳細は docs/features/auth.md を参照。
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    discord: {
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30日
    updateAge: 60 * 60 * 24, // 1日ごとに更新
    // セッションを署名付き cookie に短期キャッシュし、getSession() の毎回の DB 往復をなくす。
    // フィルタ/タブ切替は URL を変えて動的 RSC を再実行するため getSession() が都度走る。
    // cookieCache 無効だと切替ごとに session テーブルへ検証クエリが飛び、これが体感遅延の主因。
    // 失効/更新は cookie に焼いた期限で判定し、maxAge 経過後に DB を引き直す(整合性は最大 maxAge 秒遅れる)。
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5分
    },
  },
  databaseHooks: {
    user: {
      create: {
        // 初回ログイン(ユーザー作成)時に全有効企業を購読として投入(docs/adr/0012)。
        // 失敗してもユーザー作成/ログインは止めない: 冪等なので後続の企業追加JOB/再ログインで回復可能。
        after: async (createdUser) => {
          try {
            await initializeUserSubscriptions(db, createdUser.id);
          } catch (error) {
            logger.error('failed to initialize subscriptions on signup', {
              userId: createdUser.id,
              error,
            });
          }
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
