'use client';

import { X } from 'lucide-react';
import { cn } from '@/shared/utils';

/**
 * 適用中フィルタを表す削除可能チップ(「未読のみ ✕」「mercari ✕」等)。
 * 末尾の ✕ で当該フィルタだけ解除する。常に選択状態(アクセント)の見た目。
 *
 * 枠線は border ではなく box-shadow: inset で描く(選択切替による 1px レイアウトシフトを防ぐ)。
 * 見た目は小さくても tap target は 44px を確保する(h-11)。
 */
export function RemovableChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className={cn(
        'inline-flex h-11 shrink-0 items-center gap-1 whitespace-nowrap rounded-pill pr-1.5 pl-3.5 font-medium text-accent text-sm shadow-[inset_0_0_0_1px_var(--color-accent)]',
      )}
    >
      <span className="max-w-[8rem] truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${label} のフィルタを解除`}
        className="-mr-0.5 grid size-7 shrink-0 touch-manipulation place-items-center rounded-full text-accent transition-colors active:bg-accent/15"
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </span>
  );
}
