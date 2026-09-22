import { SettingsSection } from '@/components/ui/settings-section';

/**
 * 購読企業一覧(SubscriptionList)のローディング skeleton。
 * SettingsSection + 吸着ツールバー(検索 + 一括操作) + 2カラムの企業行、という同じ外形に
 * 揃え、データ解決時のレイアウトシフトを 0 にする。Suspense fallback と loading.tsx で使う。
 *
 * 行数は対象6社にあわせて 6 行(md+ は2カラム)。件数表示はデータ依存なのでプレースホルダ。
 */
export function SubscriptionListSkeleton() {
  return (
    <SettingsSection
      title={<span className="inline-block h-5 w-40 animate-pulse rounded bg-bg-surface-2" />}
      description="フィードに表示する企業を選びます。非表示にした企業の記事は表示されません。"
    >
      {/* 検索 + 一括操作(SubscriptionList と同じ sticky・行構成) */}
      <div className="sticky top-16 z-20 -mx-1 bg-bg-app px-1 pt-1 pb-3 lg:top-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden h-9 min-w-44 flex-1 animate-pulse rounded-sm bg-bg-surface-2 lg:block" />
          <div className="h-9 w-24 animate-pulse rounded-sm bg-bg-surface-2" />
          <div className="h-9 w-24 animate-pulse rounded-sm bg-bg-surface-2" />
        </div>
      </div>

      <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => i).map((i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-lg border border-border-default bg-bg-surface px-3.5 py-3 shadow-xs"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="size-6 shrink-0 animate-pulse rounded-full bg-bg-surface-2" />
              <span className="h-4 w-28 animate-pulse rounded bg-bg-surface-2" />
            </span>
            <span className="h-6 w-11 shrink-0 animate-pulse rounded-full bg-bg-surface-2" />
          </li>
        ))}
      </ul>
    </SettingsSection>
  );
}
