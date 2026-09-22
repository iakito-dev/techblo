'use client';

import { useEffect, useState } from 'react';
import { readLastProvider } from '../last-provider';

/**
 * 認証画面(/login)の見出し。OAuth のみで操作は新規/再訪とも同一のため画面は1つに統合し、
 * 文言だけを「前回利用」の記録有無で出し分ける。
 * - 初回(記録なし): 新規向けの「はじめよう」
 * - 再訪(記録あり): 「おかえりなさい」
 *
 * SSR / マウント前は初回向けで描画し、マウント後に記録があれば差し替える(ハイドレーション不一致回避)。
 */
export function AuthHeading() {
  const [returning, setReturning] = useState(false);
  useEffect(() => {
    setReturning(readLastProvider() !== null);
  }, []);

  const title = returning ? 'おかえりなさい' : 'テクブロをはじめよう';
  const subtitle = returning
    ? '前回の続きから、保存した記事や購読設定を引き継げます'
    : 'アカウントが無ければ自動で作成されます';

  return (
    <>
      <h1 className="mt-5 font-bold text-2xl tracking-tight">{title}</h1>
      {/* CJK を文節境界で折り返す(字面の途中で割れるのを防ぐ)。 */}
      <p className="mt-1 text-center text-fg-muted text-sm [word-break:auto-phrase]">{subtitle}</p>
    </>
  );
}
