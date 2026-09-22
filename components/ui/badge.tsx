import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/shared/utils';

/** 件数バッジ/カウントピル(サイドバー項目の右端など)。 */
const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full font-medium tabular-nums',
  {
    variants: {
      variant: {
        muted: 'bg-bg-surface-2 text-fg-muted',
        primary: 'border border-accent/50 bg-transparent text-accent',
      },
      size: {
        sm: 'h-5 min-w-5 px-1.5 text-xs',
      },
    },
    defaultVariants: { variant: 'muted', size: 'sm' },
  },
);

export type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}
