'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type MouseEvent, useEffect, useState } from 'react';

/**
 * 記事ページ(/a/[id])の戻る導線。
 *
 * フィードからのクリックで来た場合は router.back() で直前の一覧へ戻す。戻り先は
 * クライアントルーターキャッシュに載っているため再取得が走らず、スクロール位置も
 * ブラウザの復元に任せられる(Link で `/` へ進むと新しい履歴エントリになり、
 * 一覧の先頭から読み直しになってしまう)。
 *
 * 共有リンクで直接開いた場合(履歴が1件)は戻り先が無いので `/` への通常リンクにする。
 * 履歴の有無はハイドレーション後にしか分からないため、初期描画は常にリンクとして出し、
 * マウント後に back 動作へ差し替える(見た目は変わらないのでチラつかない)。
 */
export function ArticleBackLink({ className }: { className?: string }) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (!canGoBack) return;
    // 修飾キー付きクリックは新規タブ等の既定動作(= /)に任せる。
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    router.back();
  }

  return (
    <Link
      href="/"
      onClick={handleClick}
      className={`-ml-2 inline-flex min-h-11 touch-manipulation items-center gap-1.5 px-2 font-medium text-fg-muted text-sm transition-colors hover:text-fg-default ${className ?? ''}`}
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      戻る
    </Link>
  );
}
