'use client';

import { ProgressProvider } from '@bprogress/next/app';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { type PostHogConfig, PostHogProvider } from './posthog-provider';

/**
 * クライアント専用のグローバル Provider をまとめる境界。
 * Server Component の RootLayout から使うことで、createContext を含む client provider を
 * サーバー評価に巻き込まず安全に注入する。
 *
 * ThemeProvider: ダークモード(ADR-0038)。HeroUI は `.dark` / `data-theme="dark"` のどちらでも
 * 切り替わり、Tailwind の dark variant とアプリのトークン上書きは `.dark` を見るため、
 * 両方の属性を <html> に付ける。OS 設定への追従が既定で、切替時の transition は無効化する。
 *
 * ProgressProvider: 画面最上部のローディングバー(@bprogress/next)。フィルタ切替・ページ間遷移・
 * 戻る/進む等のクライアントナビゲーション中に表示し、コンテンツを暗くせず「読み込み中」を示す。
 *
 * PostHogProvider: プロダクト分析(app/posthog-provider.tsx)。キー未設定なら何もしない。
 */
export function Providers({ posthog, children }: { posthog: PostHogConfig; children: ReactNode }) {
  return (
    <ThemeProvider
      attribute={['class', 'data-theme']}
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ProgressProvider color="var(--color-primary)" height="2px" options={{ showSpinner: false }}>
        <PostHogProvider config={posthog}>{children}</PostHogProvider>
      </ProgressProvider>
    </ThemeProvider>
  );
}
