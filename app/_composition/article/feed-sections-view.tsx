import { FeedEventsList } from '@/features/feed/web/components/feed-events-list';
import { FeedSection } from '@/features/feed/web/components/feed-section';
import { getCategoryDefinition } from '@/shared/categories';
import { FeedEventRow } from './feed-event-row';
import { FeedRow } from './feed-list';
import type { ComposedFeedSections } from './feed-load-more';

/**
 * トップページのセクション型フィード本体(新着 + カテゴリ別の棚 + イベント)。
 * カード描画(保存アクション・AI要約込みの FeedRow)は features/feed の外(app 層)にあるため、
 * feed-section.tsx / feed-events-list.tsx へ render prop として注入する(ADR-0013 の合成点)。
 * イベント行(FeedEventRow)も同じ ComposedArticle を受け取り、ArticleCard と同じ遷移先
 * (表示回数計測・既読マーク・保存アクション・AI要約)を共有する。
 */
export function FeedSectionsView({
  sections,
  isGuest,
}: {
  sections: ComposedFeedSections;
  isGuest: boolean;
}) {
  return (
    <div className="flex flex-col">
      {/* 新着: カテゴリ不問の最新記事。棚と同じコンテナクエリ列(1〜4列)の語彙を流用する。
          もっと見るは全カテゴリの新着一覧(?sort=latest。category 無指定なので既定のセクション
          表示ではなくリスト表示になる。見出しは feed-header-title.ts の判定で「新着」)。
          items は常に LATEST_COUNT(最大列数×3行)ぶん渡し、実列数に満たない分は
          cutoff="latest" が CSS 側で隠す(ADR-0035)。 */}
      <FeedSection
        headingId="feed-section-latest"
        title="新着"
        moreHref="/?sort=latest"
        moreLabel="新着をもっと見る"
        items={sections.latest}
        cutoff="latest"
        getKey={(item) => item.article.id}
        renderItem={(item) => <FeedRow item={item} isGuest={isGuest} />}
      />

      {sections.shelves.map((shelf) => {
        const definition = getCategoryDefinition(shelf.category);
        return (
          <FeedSection
            key={shelf.category}
            headingId={`feed-shelf-${shelf.category}`}
            title={definition.label}
            moreHref={`/?category=${shelf.category}`}
            moreLabel={`${definition.label}をもっと見る`}
            items={shelf.items}
            cutoff="shelf"
            getKey={(item) => item.article.id}
            renderItem={(item) => <FeedRow item={item} isGuest={isGuest} />}
          />
        );
      })}

      {sections.events.length > 0 && (
        <FeedEventsList
          headingId="feed-shelf-event"
          moreHref="/?category=event"
          items={sections.events}
          getKey={(item) => item.article.id}
          renderRow={(item) => <FeedEventRow item={item} />}
        />
      )}
    </div>
  );
}
