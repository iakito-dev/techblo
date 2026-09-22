import { FileQuestion } from 'lucide-react';
import Link from 'next/link';
import { StatusScreen } from '@/components/layout/status-screen';
import { Button } from '@/components/ui/button';
import { MOBILE_GUTTER_CLASS } from '@/shared/layout';

/**
 * 主要画面(/a/[id] 等)の 404。shell(Header/Sidebar/MobileNav)は (app)/layout.tsx が保持し、
 * コンテンツ領域だけがこの表示に差し替わるので、ナビゲーションを失わずに戻れる。
 * 外枠の余白は同階層の loading.tsx / page.tsx と揃える。
 */
export default function NotFound() {
  return (
    <div className="min-h-dvh pb-24 lg:pt-6 lg:pb-12 lg:pl-64">
      <div className={`mx-auto max-w-[1200px] ${MOBILE_GUTTER_CLASS} md:px-6`}>
        <StatusScreen
          icon={FileQuestion}
          title="記事が見つかりません"
          description="URL が変更されたか、記事が削除された可能性があります。"
        >
          <Button asChild variant="primary" size="md">
            <Link href="/">フィードへ戻る</Link>
          </Button>
        </StatusScreen>
      </div>
    </div>
  );
}
