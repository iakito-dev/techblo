'use client';

import { Button } from '@heroui/react';
import { Check, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * 記事の共有ボタン。共有 URL は テクブロ の記事リンク(/a/[id])。
 *
 * - モバイル(coarse pointer)で Web Share API が使える場合のみネイティブ共有シート
 *   (LINE/X 等へ直接共有)を出す。
 * - デスクトップは Web Share API があっても挙動が不安定(AbortError で無反応になりがち)なため、
 *   常にリンクをコピーし、トースト + アイコンを ✓ に変える明示フィードバックを返す。
 *   = 「押しても何も起きない」を防ぎ、PC でも必ず反応する。
 */
export function ShareButton({ articleId, title }: { articleId: string; title: string }) {
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => clearTimeout(copiedTimer.current ?? undefined), []);

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('リンクをコピーしました');
      setCopied(true);
      clearTimeout(copiedTimer.current ?? undefined);
      copiedTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('共有に失敗しました');
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/a/${articleId}`;
    // モバイル(タッチ)でネイティブ共有が使えるならシートを優先。デスクトップは常にコピー。
    const canNativeShare =
      typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches;
    setPending(true);
    try {
      if (canNativeShare) {
        try {
          await navigator.share({ title, url });
        } catch (error) {
          // 共有シートのキャンセル(AbortError)は無視。それ以外はコピーにフォールバック。
          if (error instanceof Error && error.name === 'AbortError') return;
          await copyLink(url);
        }
      } else {
        await copyLink(url);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            isIconOnly
            variant="ghost"
            size="lg"
            aria-label="共有"
            isDisabled={pending}
            onPress={handleShare}
            className="relative z-10 size-11 rounded-full text-fg-subtle transition-colors hover:bg-bg-surface-2"
          >
            {copied ? <Check className="size-5 text-accent" /> : <Share2 className="size-5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copied ? 'コピーしました' : '共有'}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
