import { SavedArticlesSkeleton } from '@/app/_composition/article/saved-articles-skeleton';
import { MOBILE_GUTTER_CLASS } from '@/shared/layout';

/**
 * 閲覧履歴遷移時のローディング。shell は (app)/layout.tsx が保持し、コンテンツ領域だけ差し替わる。
 * page.tsx の Suspense fallback と同じ skeleton・同じ外枠にして、遷移開始〜データ解決まで
 * 一貫した見た目(レイアウトシフト 0)にする。
 */
export default function Loading() {
  return (
    <div className="min-h-dvh pb-24 lg:pt-6 lg:pb-12 lg:pl-64">
      <div className={`mx-auto max-w-[1200px] ${MOBILE_GUTTER_CLASS} md:px-6`}>
        <SavedArticlesSkeleton kind="history" />
      </div>
    </div>
  );
}
