'use client';

import type { ReactNode } from 'react';
import { Drawer } from 'vaul';

/**
 * モバイルのボトムシート共通シェル(vaul Drawer)。
 * ドラッグハンドル + スワイプダウンで閉じる + 背景タップで閉じるは vaul に委譲する。
 * フィルタシート(85%高)とソートのアクションシート(内容なり)で共用する。
 *
 * vaul は内部で Radix Dialog を使うのでフォーカストラップ・スクロールロック・Escape を備える。
 * Radix Dialog は a11y のため Title を要求するため、`title` は常に与える(視覚的に隠す場合は srOnlyTitle)。
 */
export function FeedBottomSheet({
  open,
  onOpenChange,
  title,
  srOnlyTitle = false,
  children,
  contentClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** タイトルを視覚的に隠す(ハンドルだけ見せたいアクションシート用)。 */
  srOnlyTitle?: boolean;
  children: ReactNode;
  /** Drawer.Content への追加クラス(高さ指定など)。 */
  contentClassName?: string;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-scrim" />
        <Drawer.Content
          className={`fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-bg-surface shadow-xl outline-none ${
            contentClassName ?? ''
          }`}
        >
          {/* ドラッグハンドル(内容全体がドラッグ可能。視覚的な掴みどころ) */}
          <div className="flex shrink-0 justify-center pt-2.5 pb-1.5">
            <span aria-hidden="true" className="h-1.5 w-10 rounded-pill bg-bg-surface-3" />
          </div>
          <Drawer.Title className={srOnlyTitle ? 'sr-only' : 'sr-only'}>{title}</Drawer.Title>
          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
