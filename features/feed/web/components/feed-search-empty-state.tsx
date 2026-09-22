'use client';

import { Button } from '@heroui/react';
import { SearchX } from 'lucide-react';
import { useFeedSearch } from '../view-models/use-feed-search';

/**
 * 検索(?q=)で該当 0 件のときの空状態(ADR-0022)。
 * 「記事がまだ無い(取得を促す)」「期間が狭い(広げる)」とは別物で、検索のクリアを主導線にする。
 * クリアは useFeedSearch 経由で URL から q を消す(トップバーの入力欄も URL 同期で空になる)。
 */
export function FeedSearchEmptyState({ query }: { query: string }) {
  const { clear, isPending } = useFeedSearch();

  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="grid size-16 place-items-center rounded-xl bg-bg-surface-2 text-fg-muted">
        <SearchX className="size-8" />
      </div>
      <p className="mt-5 font-bold text-fg-default text-lg">
        「{query}」に一致する記事はありません
      </p>
      <p className="mt-2 max-w-xs text-fg-muted text-sm leading-relaxed">
        キーワードを変えるか、企業や期間の絞り込みを見直してみてください。
      </p>
      <Button size="lg" isDisabled={isPending} onPress={clear} className="mt-6">
        検索をクリア
      </Button>
    </div>
  );
}
