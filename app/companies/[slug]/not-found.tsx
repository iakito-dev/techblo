import { Building2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { StatusScreen } from '@/components/layout/status-screen';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: '企業が見つかりません',
  robots: { index: false, follow: false },
};

/**
 * /companies/[slug] の 404。slug の打ち間違いや掲載終了が原因なので、ルート共通の
 * 「記事が削除された」文言ではなく企業ページ向けの案内にし、企業一覧へ戻れる導線を足す。
 */
export default function CompanyNotFound() {
  return (
    <div className="min-h-dvh">
      <StatusScreen
        icon={Building2}
        title="企業が見つかりません"
        description="URL が間違っているか、この企業のテックブログは掲載を終了した可能性があります。"
      >
        <Button asChild variant="primary" size="md">
          <Link href="/companies">企業一覧を見る</Link>
        </Button>
        <Button asChild variant="outline" size="md">
          <Link href="/">フィードへ戻る</Link>
        </Button>
      </StatusScreen>
    </div>
  );
}
