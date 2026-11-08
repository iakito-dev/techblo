import type { ComponentProps } from 'react';
import { cn } from '@/shared/utils';

/** 汎用テキスト入力(検索バー等)。色・角丸は既存トークンに合わせる。 */
export function Input({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'border-border-default bg-bg-surface text-fg-default placeholder:text-fg-subtle focus-visible:border-accent focus-visible:ring-accent h-9 w-full rounded-md border px-3 text-sm shadow-xs transition-colors outline-none focus-visible:ring-2 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
