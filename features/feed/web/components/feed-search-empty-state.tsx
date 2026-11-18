'use client';

import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { SearchEmptyCopy } from '../view-models/search-empty-copy';
import { useFeedSearch } from '../view-models/use-feed-search';

/**
 * 検索(?q=)で該当 0 件のときの空状態(ADR-0022)。
 * 「記事がまだ無い(取得を促す)」「期間が狭い(広げる)」とは別物。文言と導線は resolveSearchEmptyCopy が決める。
 * 絞り込み中なら「絞り込みを外して検索」(同じ語で全体から探す)を主導線に、検索のクリアを副導線にする。
 * クリアは useFeedSearch 経由で URL から q を消す(トップバーの入力欄も URL 同期で空になる)。
 */
export function FeedSearchEmptyState({ query, copy }: { query: string; copy: SearchEmptyCopy }) {
  const { clear, isPending } = useFeedSearch();
  const searchAllHref = copy.searchAllHref;

  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="bg-bg-surface-2 text-fg-muted grid size-16 place-items-center rounded-xl">
        <SearchX className="size-8" />
      </div>
      {/* URL など空白の無い長い語は折り返し点が無く画面外へはみ出すため、どこでも折れるようにする */}
      <p className="text-fg-default mt-5 max-w-full text-lg font-bold wrap-anywhere">
        「{query}」に一致する記事はありません
      </p>
      <p className="text-fg-muted mt-2 max-w-xs text-sm leading-relaxed">{copy.hint}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {searchAllHref && (
          <Button asChild variant="primary" size="md">
            <Link href={searchAllHref}>絞り込みを外して検索</Link>
          </Button>
        )}
        <Button
          variant={searchAllHref ? 'outline' : 'primary'}
          size="md"
          disabled={isPending}
          onClick={clear}
        >
          検索をクリア
        </Button>
      </div>
    </div>
  );
}
