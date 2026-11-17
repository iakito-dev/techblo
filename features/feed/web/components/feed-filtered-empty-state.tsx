import { FilterX } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { FilteredEmptyCopy } from '../view-models/filtered-empty-copy';

/**
 * 絞り込みの結果が 0 件のときの空状態(文言は resolveFilteredEmptyCopy)。
 * 「記事がまだ無い(取り込み待ち)」とは別物で、絞り込みを解除する導線を主にする。
 */
export function FeedFilteredEmptyState({ copy }: { copy: FilteredEmptyCopy }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="bg-bg-surface-2 text-fg-muted grid size-16 place-items-center rounded-xl">
        <FilterX className="size-8" />
      </div>
      {/* タグ名など空白の無い長い語でもはみ出さないよう、どこでも折れるようにする */}
      <p className="text-fg-default mt-5 max-w-full text-lg font-bold wrap-anywhere">
        {copy.title}
      </p>
      <p className="text-fg-muted mt-2 max-w-xs text-sm leading-relaxed">{copy.hint}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="primary" size="md">
          <Link href={copy.clearHref}>絞り込みを解除</Link>
        </Button>
        {copy.showTagIndexLink && (
          <Button asChild variant="outline" size="md">
            <Link href="/tags">タグ一覧を見る</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
