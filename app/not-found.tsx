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
 * shell を持たないルート(/about, /companies/[slug] 等)の 404。
 * (app) 配下は同名ファイルが shell 付きで受けるため、こちらはトップへの導線だけを置く。
 */
export default function NotFound() {
  return (
    <div className="min-h-dvh">
      <StatusScreen
        icon={FileQuestion}
        title="ページが見つかりません"
        description="URL が変更されたか、記事が削除された可能性があります。"
      >
        <Button asChild variant="primary" size="md">
          <Link href="/">フィードへ戻る</Link>
        </Button>
      </StatusScreen>
    </div>
  );
}
