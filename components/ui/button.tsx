'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/shared/utils';

/**
 * 汎用ボタン(shadcn/ui 流: cva + cn + Slot)。色は既存の3層トークンに合わせる。
 * asChild で Link 等にスタイルだけ移譲できる。
 */
const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-fg-inverse hover:bg-primary-hover',
        secondary: 'bg-bg-surface-2 text-fg-default hover:bg-bg-surface-3',
        outline:
          'border border-border-default bg-bg-surface text-fg-default shadow-xs hover:bg-bg-surface-2',
        ghost: 'text-fg-muted hover:bg-bg-surface-2 hover:text-fg-default',
      },
      size: {
        sm: 'h-9 px-3 [&_svg]:size-4',
        md: 'h-10 px-4 [&_svg]:size-4',
        icon: 'size-9 [&_svg]:size-4',
        'icon-sm': 'size-8 [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
