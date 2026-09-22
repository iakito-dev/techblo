import type { ComponentProps } from 'react';
import { cn } from '@/shared/utils';

/** 汎用テキスト入力(検索バー等)。色・角丸は既存トークンに合わせる。 */
export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'h-9 w-full rounded-md border border-border-default bg-bg-surface px-3 text-fg-default text-sm shadow-xs outline-none transition-colors placeholder:text-fg-subtle focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
