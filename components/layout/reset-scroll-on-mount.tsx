'use client';

import { useLayoutEffect } from 'react';

/** popstate からこの時間内のマウントは戻る/進むによるものとみなし、スクロール復元を妨げない。 */
const POP_NAVIGATION_WINDOW_MS = 1000;

let lastPopStateAt = -Infinity;
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    lastPopStateAt = performance.now();
  });
}

/**
 * マウント時にページ先頭へスクロールする(描画物は無い)。
 *
 * Next.js の遷移時スクロールは「新しいセグメントの先頭要素がビューポート内にあれば動かさない」
 * 判定のため、sticky ヘッダーの裏に先頭が隠れていても「見えている」とみなされる。
 * モバイルのフィード(共通 Header を隠す)から記事ページ(Header が出る)へ進むと、
 * 一覧のスクロール位置が短いページに合わせて詰められた中途半端な位置で止まり、
 * タイトルがヘッダーの下に潜って開く。これを着地側で先頭に戻して補う。
 *
 * 戻る/進む(popstate)ではブラウザ・ルーターのスクロール復元を優先し、何もしない。
 */
export function ResetScrollOnMount() {
  useLayoutEffect(() => {
    if (performance.now() - lastPopStateAt < POP_NAVIGATION_WINDOW_MS) return;
    window.scrollTo(0, 0);
  }, []);
  return null;
}
