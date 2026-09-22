import {
  FeedTopbarSkeleton,
  MobileFeedHeaderSkeleton,
} from '@/features/feed/web/components/feed-chrome-skeleton';
import { FeedGridSkeleton } from '@/features/feed/web/components/feed-grid';
import { MOBILE_GUTTER_CLASS } from '@/shared/layout';

/**
 * フィード(/)遷移時のローディング。shell(Header/Sidebar/MobileNav)は (app)/layout.tsx が
 * 保持したまま、このコンテンツ領域だけが差し替わる。page.tsx と同じ上部クローム(モバイル=検索/
 * 絞り込みヘッダー、デスクトップ=上部バー + 見出し行)の skeleton を出し、解決時のレイアウト
 * シフトをなくす。
 *
 * 特にモバイル(<md)のフィードは共通 Header(ロゴ帯)を隠して MobileFeedControls が上部を
 * 担うため、ここで上部クロームを省くと「遷移中は上部が何も無い → 解決時に検索行と件数行が
 * 生えてカードが押し下がる」ことになる(PR: モバイルのローディング前後の表示差を解消)。
 *
 * 注: route group 直下の loading は配下ルートの既定 fallback も兼ねるが、
 * bookmarks/favorites/settings は各自 loading.tsx を持つためここはフィード専用。
 */
export default function Loading() {
  return (
    // 下余白も page.tsx と一致させる(モバイルは下部ナビ高 + 1rem)。
    <div className="min-h-dvh pb-[calc(var(--mobile-nav-h)+1rem)] lg:pb-12 lg:pl-64">
      <MobileFeedHeaderSkeleton />
      <FeedTopbarSkeleton />
      {/* タブレット(md〜lg)の上部1行ツールバー枠。page.tsx の並び替えタブ(p-1 + h-9)と同じ高さ。 */}
      <div className="hidden md:mb-6 md:block md:px-6 md:pt-2 lg:hidden">
        <div className="h-11 w-full" />
      </div>
      {/* コンテンツ枠の余白・max-w・@container は page.tsx と一致させる(解決時のレイアウトシフト防止・
          列数決定のためのコンテナクエリ。ADR-0035)。 */}
      <div
        className={`@container mx-auto max-w-[1680px] ${MOBILE_GUTTER_CLASS} pt-4 md:px-6 md:pt-0 lg:px-8 lg:pt-6`}
      >
        {/* 見出し行(lg+)は page.tsx の Suspense fallback と同じ高さの空枠にする。 */}
        <div className="hidden h-9 lg:block" />
        <FeedGridSkeleton count={24} variant="columns" />
      </div>
    </div>
  );
}
