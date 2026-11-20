'use client';

import { Button } from '@heroui/react';
import { X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * 閲覧履歴のカードに出す「閲覧履歴から削除」ボタン(ADR-0049)。
 * 見た目と当たり判定(44px・hover の円・押下の押し込み)は保存ボタン(ActionButtons)にそろえる。
 */
export function RemoveFromHistoryButton({
  onRemove,
  disabled = false,
}: {
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            isIconOnly
            variant="ghost"
            size="lg"
            aria-label="閲覧履歴から削除"
            isDisabled={disabled}
            onPress={onRemove}
            className="hover:bg-bg-surface-2 active:bg-bg-surface-2 text-fg-subtle hover:text-fg-default relative z-10 size-11 touch-manipulation rounded-full transition-[color,background-color,transform] active:scale-90"
          >
            <X className="size-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>閲覧履歴から削除</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
