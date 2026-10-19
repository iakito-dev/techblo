'use client';

import { useEffect, useRef, useState } from 'react';

/** デスクトップ設定ページのセクション(id は settings-desktop.tsx の各ブロックと一致させる)。 */
export const SETTINGS_SECTIONS = [
  { id: 'account', label: 'アカウント' },
  { id: 'companies', label: '表示する企業' },
  { id: 'feeds', label: 'マイフィード' },
  { id: 'appearance', label: '表示' },
  { id: 'support', label: 'サポート' },
] as const;

/** この位置(viewport 上端からの px)より上に先頭が来たセクションを表示中とみなす。 */
const ACTIVE_OFFSET_PX = 120;

/**
 * デスクトップ(xl+)設定ページ右側の目次。企業一覧が長く、下のマイフィード / 表示 / サポートまで
 * スクロールしないと届かないため、各セクションへ直接ジャンプできるようにする。
 * スクロール位置から表示中のセクションを求めて強調する。
 */
export function SettingsToc() {
  const [active, setActive] = useState<string>(SETTINGS_SECTIONS[0].id);

  // 目次クリックで飛んだ先。ページ末尾では下のセクションが上端まで届かないため、
  // 末尾ではユーザーが選んだものを優先して強調する(次の手動スクロール操作で解除)。
  const clicked = useRef<string | null>(null);

  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const atBottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      if (atBottom && clicked.current) {
        setActive(clicked.current);
        return;
      }
      // 先頭が画面上端付近(ACTIVE_OFFSET_PX)より上に来ている最後のセクションを「表示中」とする。
      let current: string = SETTINGS_SECTIONS[0].id;
      for (const s of SETTINGS_SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= ACTIVE_OFFSET_PX) current = s.id;
      }
      if (atBottom) current = SETTINGS_SECTIONS.at(-1)?.id ?? current;
      setActive(current);
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    function onManualScroll() {
      clicked.current = null;
    }
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onManualScroll, { passive: true });
    window.addEventListener('touchstart', onManualScroll, { passive: true });
    window.addEventListener('keydown', onManualScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onManualScroll);
      window.removeEventListener('touchstart', onManualScroll);
      window.removeEventListener('keydown', onManualScroll);
    };
  }, []);

  return (
    <nav aria-label="設定の目次" className="sticky top-6">
      <ul className="flex flex-col gap-0.5 border-border-default border-l">
        {SETTINGS_SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? 'location' : undefined}
              onClick={() => {
                clicked.current = s.id;
                setActive(s.id);
              }}
              className={`-ml-px block border-l-2 py-1.5 pl-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                active === s.id
                  ? 'border-accent font-medium text-fg-default'
                  : 'border-transparent text-fg-muted hover:text-fg-default'
              }`}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
