'use client';

import { useTheme } from 'next-themes';
import { Toaster } from 'sonner';

/**
 * sonner のトーストを選択中のテーマに追従させる。sonner 単体の `system` は
 * OS 設定しか見ないため、手動でライト/ダークを選んだ場合にずれる。
 */
export function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster position="top-center" richColors theme={resolvedTheme === 'dark' ? 'dark' : 'light'} />
  );
}
