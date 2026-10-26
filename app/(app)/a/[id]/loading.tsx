import { ResetScrollOnMount } from '@/components/layout/reset-scroll-on-mount';
import { ArticleDetailSkeleton } from '@/features/feed/web/components/article-detail-skeleton';
import { MOBILE_GUTTER_CLASS } from '@/shared/layout';

/**
 * 記事ページ(/a/[id])遷移時のローディング。
 *
 * これが無いと (app)/loading.tsx(フィード用の一覧 skeleton)が配下ルートの既定 fallback として
 * 使われ、記事へ進むたびに一瞬カード一覧の skeleton が出る。page.tsx と同じ外枠・戻る行の高さで
 * 記事1本分の skeleton を出し、本文到着時に位置が動かないようにする。
 *
 * 戻る行は skeleton では枠だけ(min-h-11 相当)にする。ArticleBackLink はクライアント
 * コンポーネントで履歴を見るため、ここで実物を出しても遷移後に再マウントされる。
 */
export default function Loading() {
  return (
    <div className="min-h-dvh pb-[calc(var(--mobile-nav-h)+1rem)] lg:pb-12 lg:pl-64">
      <main
        className={`mx-auto max-w-2xl max-lg:-mt-4 xl:max-w-[66rem] ${MOBILE_GUTTER_CLASS} pb-8 md:px-6 md:pb-10 lg:px-8 lg:pt-6`}
      >
        <ResetScrollOnMount />
        <div className="mb-1 h-11" />
        <ArticleDetailSkeleton />
      </main>
    </div>
  );
}
