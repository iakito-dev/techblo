import { FileQuestion } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { StatusScreen } from '@/components/layout/status-screen';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'ページが見つかりません',
  robots: { index: false, follow: false },
};

/**
 * shell を持たないルート(/about, /tags 等)の 404。
 * (app) 配下は同名ファイルが shell 付きで受けるため、こちらはトップへの導線だけを置く。
 */
export default function NotFound() {
  return (
    <main className="min-h-dvh">
      <StatusScreen
        icon={FileQuestion}
        title="ページが見つかりません"
        // ここに来るのは記事以外も含む「どのルートにも一致しない URL」(記事 ID の 404 は (app)/not-found.tsx)。
        // 記事前提の文言だと、打ち間違えた URL でも「記事が削除された」と誤解させるため、ページ一般の言い方にする。
        description="URL に誤りがあるか、ページが移動・削除された可能性があります。"
      >
        <Button asChild variant="primary" size="md">
          <Link href="/">フィードへ戻る</Link>
        </Button>
      </StatusScreen>
    </main>
  );
}
