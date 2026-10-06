'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useOptionalBottomChrome } from './bottom-chrome';

/** ビューポート高のこの倍数を超えて下がったら「長い一覧を読み進めた」とみなして出す。 */
const SHOW_THRESHOLD_VIEWPORTS = 1.5;

/**
 * 長い一覧の下端から先頭へ戻るための丸ボタン。
 * スクロール監視は rAF で間引き、表示/非表示の真偽値が変わるときだけ state を更新する
 * (毎フレームの再レンダを避けるため)。
 * モバイルの下部ナビは下スクロールで退避するので、同じ Context を購読して位置を追従させる。
 * Provider 外(公開ページ)では下部ナビが無いので常に右下隅に置く。
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const bottomChrome = useOptionalBottomChrome();
  const navHidden = bottomChrome ? bottomChrome.hidden : true;

  useEffect(() => {
    let ticking = false;
    let current = false;

    const update = () => {
      ticking = false;
      const next = window.scrollY > window.innerHeight * SHOW_THRESHOLD_VIEWPORTS;
      if (next === current) return;
      current = next;
      setVisible(next);
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="ページの先頭へ戻る"
      inert={!visible}
      tabIndex={visible ? 0 : -1}
      className={`fixed right-4 z-40 flex size-11 items-center justify-center rounded-full border border-border-default bg-bg-surface text-fg-default shadow-md transition-[opacity,translate,bottom] duration-200 ease-out hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none lg:right-6 lg:bottom-6 ${
        navHidden ? 'bottom-6' : 'bottom-[calc(var(--mobile-nav-h)+1rem)]'
      } ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}
    >
      <ArrowUp className="size-5" aria-hidden="true" />
    </button>
  );
}
