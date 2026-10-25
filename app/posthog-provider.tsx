'use client';

import type { ReactNode } from 'react';
import { AnalyticsIdentity } from '@/features/auth/components/analytics-identity';
import { initPostHog } from '@/lib/observability/posthog';

export type PostHogConfig = { key: string | undefined; host: string | undefined };

/**
 * PostHog(プロダクト分析)の Provider。pageview は App Router の遷移も含め posthog-js が
 * history の変化から自動で送る。ここではセッションとの identify / reset 同期を載せる。
 * イベント一覧: docs/architecture/observability.md §4。
 *
 * キーは RootLayout(サーバー)が lib/env から読んで渡す。ここで lib/env を import すると
 * zod がクライアントバンドルに戻るため(ADR-0042)。キー未設定なら init されず、以降の計測は
 * すべて no-op(lib/observability/posthog.ts)。
 */
export function PostHogProvider({
  config,
  children,
}: {
  config: PostHogConfig;
  children: ReactNode;
}) {
  // useEffect ではなく描画中に init する。effect は子から先に走るため、effect で init すると
  // 子の初回 capture / identify が init 前に呼ばれて落ちる。initPostHog は冪等でサーバーでは何もしない。
  initPostHog(config);
  return (
    <>
      {/* キー未設定なら同期先が無いので、セッション取得も起こさない。 */}
      {config.key ? <AnalyticsIdentity /> : null}
      {children}
    </>
  );
}
