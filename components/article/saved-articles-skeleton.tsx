import { Bookmark, Heart, History } from 'lucide-react';
import { FeedGridSkeleton } from '@/features/feed/web/components/feed-grid';

const KIND_CONFIG = {
  bookmark: { Icon: Bookmark, title: 'あとで読む' },
  favorite: { Icon: Heart, title: 'お気に入り' },
  history: { Icon: History, title: '閲覧履歴' },
} as const;

/**
 * 保存記事(ブックマーク/お気に入り)・閲覧履歴の一覧のローディング skeleton。
 * SavedArticlesView / ReadingHistoryView と同じ外形(見出し行 → 件数行 → feed-grid)に揃え、データ解決時の
 * レイアウトシフトを 0 にする。Suspense fallback と loading.tsx の両方で使う。
 *
 * 見出し(アイコン + タイトル)はデータ非依存なので skeleton でも実物を出す(即時表示)。
 * 件数とソートはデータ依存なのでプレースホルダにする。
 */
export function SavedArticlesSkeleton({ kind }: { kind: keyof typeof KIND_CONFIG }) {
  const { Icon, title } = KIND_CONFIG[kind];
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="size-5 text-primary" />
          <h1 className="font-bold text-xl tracking-tight">{title}</h1>
        </div>
      </div>
      {/* 「N件」と同じ行高のプレースホルダ(-mt-2 mb-5 も SavedArticlesView と一致させる) */}
      <div className="-mt-2 mb-5 h-5 w-20 animate-pulse rounded bg-bg-surface-3" />
      <FeedGridSkeleton />
    </section>
  );
}
