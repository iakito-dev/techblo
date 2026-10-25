'use client';

import { type ReactNode, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { matchesCompanyName } from './company-name-match';

/**
 * 企業ハブの企業名絞り込み。カード(children の ul > li[data-company-name])は RSC が
 * 全件 SSR したままにし、ここでは非一致の li に hidden 属性を付けるだけにする
 * (リンクを HTML から消さない = クローラの内部リンク集約を保つ)。
 * children は親が再描画されても同じ要素のままなので、付けた hidden は React に上書きされない。
 * 入力は 16px(text-base)で iOS のフォーカス時自動ズームを避ける。IME 変換中も入力途中の文字で部分一致させる。
 */
export function CompaniesFilter({ children }: { children: ReactNode }) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [noMatch, setNoMatch] = useState(false);

  function apply(query: string) {
    const items = listRef.current?.querySelectorAll<HTMLElement>('li[data-company-name]');
    if (!items) return;
    let visible = 0;
    for (const item of items) {
      const match = matchesCompanyName(item.dataset.companyName ?? '', query);
      item.hidden = !match;
      if (match) visible += 1;
    }
    setNoMatch(visible === 0);
  }

  return (
    <>
      <div className="mb-4 max-w-md">
        <Input
          type="search"
          aria-label="企業名で絞り込む"
          placeholder="企業名で絞り込む"
          autoComplete="off"
          enterKeyHint="search"
          className="h-11 text-base"
          onChange={(e) => apply(e.target.value)}
        />
      </div>
      {noMatch && (
        <p className="rounded-md border border-border-default bg-bg-surface p-12 text-center text-fg-muted">
          一致する企業がありません。
        </p>
      )}
      <div ref={listRef}>{children}</div>
    </>
  );
}
