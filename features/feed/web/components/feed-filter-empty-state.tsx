import { FilterX } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * タグ・カテゴリ・企業・既読状態などの絞り込みで該当 0 件のときの空状態。
 * 「記事がまだ無い(取り込み待ち)」とは別物なので、絞り込みを解除してフィードへ戻る導線を主にする。
 * 絞り込みは URL のクエリで持つため、解除は `/` へのリンクで足りる(クライアント状態なし)。
 */
export function FeedFilterEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="grid size-16 place-items-center rounded-xl bg-bg-surface-2 text-fg-muted">
        <FilterX className="size-8" />
      </div>
      <p className="mt-5 font-bold text-fg-default text-lg">条件に一致する記事はありません</p>
      <p className="mt-2 max-w-xs text-fg-muted text-sm leading-relaxed">
        タグや企業などの絞り込みを見直してみてください。
      </p>
      <Button asChild variant="primary" size="md" className="mt-6">
        <Link href="/">絞り込みを解除</Link>
      </Button>
    </div>
  );
}
