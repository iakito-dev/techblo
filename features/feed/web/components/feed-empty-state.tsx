import { Inbox } from 'lucide-react';

/**
 * フィードが空(まだ記事が取り込まれていない)ときの状態。
 * 記事の取り込みは定期ジョブに委ねるため、手動取得ボタンは置かない。
 */
export function FeedEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="grid size-16 place-items-center rounded-xl border border-border-default text-accent">
        <Inbox className="size-8" />
      </div>
      <p className="mt-5 font-bold text-fg-default text-lg">記事がまだありません</p>
      <p className="mt-2 max-w-xs text-fg-muted text-sm leading-relaxed">
        各社のテックブログから定期的に記事を取り込んでいます。しばらくしてから再度確認してください。
      </p>
    </div>
  );
}
