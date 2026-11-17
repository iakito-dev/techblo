import { Building2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * 表示する企業をすべて OFF にしてフィードが空になったときの空状態。
 * 他の空状態(絞り込み・検索・期間)と同じ見た目にそろえ、設定の「表示する企業」へ直接飛ばす。
 * `/settings` だとモバイルは設定メニューに着地し、もう 1 タップ要るため `/settings/companies` にする
 * (デスクトップは同ページが設定全体を描画するので `#companies` で該当セクションへスクロールさせる)。
 */
export function FeedAllOffEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="bg-bg-surface-2 text-fg-muted grid size-16 place-items-center rounded-xl">
        <Building2 className="size-8" />
      </div>
      <p className="text-fg-default mt-5 text-lg font-bold">表示する企業がありません</p>
      <p className="text-fg-muted mt-2 max-w-xs text-sm leading-relaxed">
        すべての企業を非表示にしています。設定で表示する企業を選んでください。
      </p>
      <Button asChild variant="primary" size="md" className="mt-6">
        <Link href="/settings/companies#companies">表示する企業を選ぶ</Link>
      </Button>
    </div>
  );
}
