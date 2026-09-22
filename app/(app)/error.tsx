'use client';

import { TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { StatusScreen } from '@/components/layout/status-screen';
import { Button } from '@/components/ui/button';
import { MOBILE_GUTTER_CLASS } from '@/shared/layout';

/**
 * 主要画面の error boundary。shell は (app)/layout.tsx が保持するため、
 * 取得失敗時もヘッダー/ナビは残り、再試行か他画面への移動ができる。
 * 将来 Sentry への送信を追加(M6)。
 */
export default function RouteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-dvh pb-24 lg:pt-6 lg:pb-12 lg:pl-64">
      <div className={`mx-auto max-w-[1200px] ${MOBILE_GUTTER_CLASS} md:px-6`}>
        <StatusScreen
          icon={TriangleAlert}
          title="読み込みに失敗しました"
          description="一時的な問題の可能性があります。時間をおいて再度お試しください。"
        >
          <Button type="button" variant="primary" size="md" onClick={() => reset()}>
            再試行
          </Button>
          <Button asChild variant="outline" size="md">
            <Link href="/">フィードへ戻る</Link>
          </Button>
        </StatusScreen>
      </div>
    </div>
  );
}
