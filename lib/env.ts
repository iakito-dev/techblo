import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/**
 * 環境変数を Zod で型付け + 起動時検証。
 * `process.env.X` の直接参照は禁止 → `env.X` 経由で必ず参照する。
 */
export const env = createEnv({
  server: {
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    DATABASE_URL: z.string().url(),

    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    DISCORD_CLIENT_ID: z.string().min(1),
    DISCORD_CLIENT_SECRET: z.string().min(1),

    TRIGGER_SECRET_KEY: z.string().optional(),
    TRIGGER_PROJECT_REF: z.string().optional(),

    SENTRY_DSN: z.string().url().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),

    RESEND_API_KEY: z.string().optional(),

    // AI記事要約(ADR-0026)。未設定なら要約生成は無効(NotConfigured クライアント)。
    // 表示・取得は要約が無ければセクション非表示になるだけなので、未設定でもアプリは動く。
    GEMINI_API_KEY: z.string().optional(),
    // 使用モデル ID。未設定時は lib/ai のデフォルト(gemini-3.1-flash-lite)。
    AI_SUMMARY_MODEL: z.string().optional(),

    // 取込 cron(trigger.dev)→ /api/revalidate のフィードキャッシュ即時無効化を保護する共有シークレット。
    // 未設定なら revalidate は無効(route は 401・cron はスキップ)。本番では Vercel と trigger.dev の両方に同値を設定する。
    REVALIDATE_SECRET: z.string().min(16).optional(),
  },
  client: {
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET,
    TRIGGER_SECRET_KEY: process.env.TRIGGER_SECRET_KEY,
    TRIGGER_PROJECT_REF: process.env.TRIGGER_PROJECT_REF,
    SENTRY_DSN: process.env.SENTRY_DSN,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    SENTRY_ORG: process.env.SENTRY_ORG,
    SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    AI_SUMMARY_MODEL: process.env.AI_SUMMARY_MODEL,
    REVALIDATE_SECRET: process.env.REVALIDATE_SECRET,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
  // ビルド時にこれが true ならスキップ(CI build用)
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
  emptyStringAsUndefined: true,
});
