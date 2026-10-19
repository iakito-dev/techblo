import { ListFilter, Search } from 'lucide-react';
import { LogoMark } from '@/components/layout/logo';
import { MOBILE_GUTTER_CLASS } from '@/shared/layout';

/**
 * フィードの上部クローム(モバイル検索/絞り込みヘッダー・デスクトップ上部バー)の skeleton。
 *
 * 目的は「遷移中(loading.tsx)とデータ解決後で上部クロームの有無が変わらない」こと。
 * モバイル(<md)のフィードは共通 Header(ロゴ帯)を隠して MobileFeedControls が上部を担うため、
 * loading.tsx にこの skeleton を置かないと遷移中だけ上部が消え、解決時に検索行/件数行が
 * 生えてコンテンツが押し下がる(体感の大きなガタつき)。
 *
 * URL / セッションを読まないため server component のまま置ける(loading.tsx は Provider 外)。
 * 各行の寸法は MobileFeedHeaderView / FeedTopbar と一致させる(高さが変わるとシフトする)。
 */
export function MobileFeedHeaderSkeleton() {
  return (
    <div className="sticky top-0 z-30 bg-bg-app md:hidden">
      {/* 1 行目: ロゴマーク + 検索 + 絞り込みアイコン(実物と同じ枠を出し、中身だけ静止させる) */}
      <div
        className={`flex items-center gap-2 border-border-default border-b-[0.5px] ${MOBILE_GUTTER_CLASS} pt-[calc(env(safe-area-inset-top,0px)+0.625rem)] pb-2.5`}
      >
        {/* ロゴマークはデータ非依存なので skeleton でも実物を出す(遷移中も消えない)。 */}
        <LogoMark />
        <div className="relative min-w-0 flex-1">
          <Search className="absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-fg-subtle" />
          <div className="h-11 w-full rounded-md border border-border-default bg-bg-surface-2 pr-10 pl-9" />
        </div>
        <div className="grid size-11 shrink-0 place-items-center rounded-md text-fg-subtle shadow-[inset_0_0_0_1px_var(--color-border-strong)]">
          <ListFilter className="size-[18px]" />
        </div>
      </div>
    </div>
  );
}

/**
 * デスクトップ(lg+)上部バーの skeleton。FeedTopbar と同じ sticky・高さ・境界線にして、
 * 遷移中に上部バーが消える/解決時に生えるのを防ぐ。
 */
export function FeedTopbarSkeleton() {
  return (
    <div className="sticky top-0 z-20 hidden h-16 border-border-default border-b bg-bg-app/80 backdrop-blur-xl backdrop-saturate-150 lg:block">
      {/* FeedTopbar と同じ最大幅(1680px)にそろえる(解決時のレイアウトシフト防止。ADR-0035)。 */}
      <div className="mx-auto flex h-16 max-w-[1680px] items-center gap-3 px-4 md:px-6 lg:px-8">
        <div className="relative max-w-md flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-fg-subtle" />
          <div className="h-9 w-full rounded-md border border-border-default bg-bg-surface-2" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="size-9 rounded-md bg-bg-surface-2" />
          <div className="size-9 animate-pulse rounded-full bg-bg-surface-3" />
        </div>
      </div>
    </div>
  );
}
