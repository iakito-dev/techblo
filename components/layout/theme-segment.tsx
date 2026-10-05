'use client';

import { Laptop, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const OPTIONS = [
  { value: 'system', label: 'システム', icon: Laptop },
  { value: 'light', label: 'ライト', icon: Sun },
  { value: 'dark', label: 'ダーク', icon: Moon },
] as const;

/**
 * テーマ切替のセグメント(システム / ライト / ダーク)。
 * 保存値は localStorage 由来でサーバーは知らないため、マウント前は未選択で描画して
 * hydration mismatch を避ける。
 */
export function ThemeSegment() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <fieldset
      aria-label="テーマ"
      className="m-0 grid min-w-0 grid-cols-3 gap-1 rounded-md border border-border-default bg-bg-surface-2 p-1"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            onClick={() => setTheme(value)}
            className={`flex min-h-10 items-center justify-center gap-1.5 rounded-sm font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              selected
                ? 'bg-bg-surface text-fg-default shadow-xs ring-1 ring-border-strong'
                : 'text-fg-muted hover:text-fg-default'
            }`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </fieldset>
  );
}
