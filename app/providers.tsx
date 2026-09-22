'use client';

import { ProgressProvider } from '@bprogress/next/app';
import type { ReactNode } from 'react';

/**
 * クライアント専用のグローバル Provider をまとめる境界。
 * Server Component の RootLayout から使うことで、createContext を含む client provider を
 * サーバー評価に巻き込まず安全に注入する。
 *
 * ProgressProvider: 画面最上部のローディングバー(@bprogress/next)。フィルタ切替・ページ間遷移・
 * 戻る/進む等のクライアントナビゲーション中に表示し、コンテンツを暗くせず「読み込み中」を示す。
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ProgressProvider color="var(--color-primary)" height="2px" options={{ showSpinner: false }}>
      {children}
    </ProgressProvider>
  );
}
