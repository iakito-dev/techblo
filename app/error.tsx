'use client';

import { TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { StatusScreen } from '@/components/layout/status-screen';
import { Button } from '@/components/ui/button';

/**
 * shell を持たないルートの error boundary。
 * これが無いと個別ルートの例外が global-error まで抜け、ページ全体(html ごと)が
 * 素の英語エラー画面に差し替わる。ここで受けてリトライ導線を出す。
 * 将来 Sentry への送信を追加(M6)。
 */
export default function RouteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-dvh">
      <StatusScreen
        icon={TriangleAlert}
        title="エラーが発生しました"
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
  );
}
