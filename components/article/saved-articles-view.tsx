'use client';

import { Button, Dropdown, Label } from '@heroui/react';
import { ArrowUpDown, Bookmark, ChevronDown, Heart, Inbox } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { ArticleSummaryDto } from '@/features/ai-summary/application/dto';
import { setBookmarkAction } from '@/features/bookmarks/web/actions';
import { setFavoriteAction } from '@/features/favorites/web/actions';
import type { ArticleCard as ArticleCardType } from '@/features/feed/application/dto';
import { ArticleCard } from '@/features/feed/web/components/article-card';
import { FEED_GAP_CLASS } from '@/features/feed/web/feed-grid-classes';
import { ActionButtons } from './article-actions';
import { type GuestSaveKind, setGuestSave, useGuestSaves } from './use-guest-saves';

type SavedKind = Exclude<GuestSaveKind, 'read'>;

const KIND_CONFIG = {
  bookmark: {
    Icon: Bookmark,
    title: 'あとで読む',
    emptyTitle: 'あとで読む記事がまだありません',
    emptyHint: '気になる記事を保存するとここに表示されます',
    unsavedMessage: 'あとで読むから削除しました',
  },
  favorite: {
    Icon: Heart,
    title: 'お気に入り',
    emptyTitle: 'お気に入りがまだありません',
    emptyHint: 'お気に入りした記事がここに表示されます',
    unsavedMessage: 'お気に入りを解除しました',
  },
} satisfies Record<SavedKind, unknown>;

type SavedSort = 'savedAt' | 'publishedAt';

const SORT_OPTIONS: { value: SavedSort; label: string }[] = [
  { value: 'savedAt', label: '保存した日' },
  { value: 'publishedAt', label: '記事の公開日' },
];

/** フェードアウト時間(ms)。wrapper の duration-300 と合わせる。 */
const LEAVE_DURATION = 300;
const UNDO_DURATION = 5000;

/**
 * 保存記事(ブックマーク/お気に入り)の一覧。ログイン/ゲスト共用のクライアントビュー。
 *
 * - 解除 Undo: ページ種別の解除はカードを即削除せずフェードアウト + トーストの「元に戻す」で
 *   元の位置に復元できる(誤タップによる保存消失の防止)。サーバーへは解除を即送り、Undo は
 *   再保存を送る(どちらも冪等)。一覧は初期 props で固定し、revalidate による並び替えを受けない。
 * - 並び替え: 保存した日(props 順 = 新しい順)/ 記事の公開日。
 * - 記事の props はサーバー(またはゲストの localStorage 解決)から受け、状態はここで持つ。
 */
export function SavedArticlesView({
  kind,
  articles,
  bookmarkedIds,
  favoritedIds,
  summaries = {},
  isGuest = false,
}: {
  kind: SavedKind;
  articles: ArticleCardType[];
  bookmarkedIds: string[];
  favoritedIds: string[];
  /** 記事 ID をキーにした AI要約。カードの AIタグに使う(無い記事はキー無し)。 */
  summaries?: Record<string, ArticleSummaryDto>;
  isGuest?: boolean;
}) {
  const { Icon, title, emptyTitle, emptyHint, unsavedMessage } = KIND_CONFIG[kind];
  // 解除の revalidate で props が更新されてもカードを保持する(Undo で元の位置に復元するため、
  // 一覧は初回マウント時点で固定。離脱→再訪時にサーバーの最新状態へ揃う)。
  const [stableArticles] = useState(articles);
  const [sort, setSort] = useState<SavedSort>('savedAt');
  // ページ種別を解除した記事(フェード中 → hidden)。Undo で両方から外して復元する。
  const [unsavedIds, setUnsavedIds] = useState<ReadonlySet<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set());
  const hideTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const visibleCount = stableArticles.filter((a) => !unsavedIds.has(a.id)).length;
  const sorted =
    sort === 'publishedAt'
      ? [...stableArticles].sort(
          (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
        )
      : stableArticles;

  function persistPageSaved(articleId: string, next: boolean) {
    if (isGuest) {
      // hook の toggle は古い closure から呼ばれると逆向きに反転するため、純関数で明示的に設定する
      setGuestSave(kind, articleId, next);
      return;
    }
    const call =
      kind === 'bookmark'
        ? setBookmarkAction({ articleId, bookmarked: next })
        : setFavoriteAction({ articleId, favorited: next });
    void call.then((result) => {
      if (result.ok) return;
      if (next) {
        toast.error('元に戻せませんでした');
        markUnsaved(articleId);
      } else {
        toast.error('解除に失敗しました');
        restore(articleId);
      }
    });
  }

  function markUnsaved(articleId: string) {
    setUnsavedIds((prev) => new Set(prev).add(articleId));
    // フェード完了後に display:none(グリッド詰め)へ移行する
    hideTimers.current.set(
      articleId,
      setTimeout(() => {
        setHiddenIds((prev) => new Set(prev).add(articleId));
        hideTimers.current.delete(articleId);
      }, LEAVE_DURATION),
    );
  }

  function restore(articleId: string) {
    const timer = hideTimers.current.get(articleId);
    if (timer) {
      clearTimeout(timer);
      hideTimers.current.delete(articleId);
    }
    setUnsavedIds((prev) => {
      const next = new Set(prev);
      next.delete(articleId);
      return next;
    });
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.delete(articleId);
      return next;
    });
  }

  function handleUnsave(articleId: string) {
    markUnsaved(articleId);
    persistPageSaved(articleId, false);
    toast(unsavedMessage, {
      duration: UNDO_DURATION,
      action: {
        label: '元に戻す',
        onClick: () => {
          restore(articleId);
          persistPageSaved(articleId, true);
        },
      },
    });
  }

  const bookmarkedSet = new Set(bookmarkedIds);
  const favoritedSet = new Set(favoritedIds);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="size-5 text-fg-muted" />
          <h1 className="font-bold text-xl tracking-tight">{title}</h1>
        </div>
        {visibleCount > 1 && <SortDropdown sort={sort} onSelect={setSort} />}
      </div>
      <p className="-mt-2 mb-5 text-fg-muted text-sm">{visibleCount}件の記事</p>

      {visibleCount === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
          <Inbox className="size-10 text-fg-subtle" />
          <p className="mt-4 font-bold text-fg-default">{emptyTitle}</p>
          <p className="mt-1 text-fg-muted text-sm">{emptyHint}</p>
          <Link href="/" className="mt-4 font-medium text-accent text-sm hover:underline">
            フィードを見る
          </Link>
        </div>
      ) : (
        <>
          <div className={`feed-grid ${FEED_GAP_CLASS}`}>
            {sorted.map((article) => {
              if (hiddenIds.has(article.id)) return null;
              const leaving = unsavedIds.has(article.id);
              const summary = summaries[article.id];
              return (
                <div
                  key={article.id}
                  inert={leaving || undefined}
                  className={`transition-[opacity,transform] duration-300 ease-out ${
                    leaving ? 'scale-95 opacity-0' : ''
                  }`}
                >
                  <ArticleCard
                    article={article}
                    overview={summary?.overview ?? null}
                    tags={summary?.tags ?? []}
                    actions={
                      <SavedCardActions
                        articleId={article.id}
                        kind={kind}
                        isGuest={isGuest}
                        otherInitial={
                          kind === 'bookmark'
                            ? favoritedSet.has(article.id)
                            : bookmarkedSet.has(article.id)
                        }
                        onUnsave={() => handleUnsave(article.id)}
                      />
                    }
                  />
                </div>
              );
            })}
          </div>
          {/* 件数が少ないと左上に寄って空白が広がるため、薄い補足で「これから増える」ことを示す */}
          {visibleCount <= 2 && (
            <p className="mt-8 text-center text-fg-subtle text-sm">
              {emptyHint}。
              <Link href="/" className="ml-1 text-accent hover:underline">
                フィードを見る →
              </Link>
            </p>
          )}
        </>
      )}
    </section>
  );
}

function SortDropdown({
  sort,
  onSelect,
}: {
  sort: SavedSort;
  onSelect: (next: SavedSort) => void;
}) {
  const currentLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? '保存した日';
  return (
    <Dropdown>
      <Button
        variant="outline"
        aria-label="並び替え"
        className="h-9 shrink-0 gap-1.5 rounded-sm bg-bg-surface font-medium text-sm shadow-xs"
      >
        <ArrowUpDown className="size-4 shrink-0 text-fg-muted" />
        <span className="whitespace-nowrap">{currentLabel}</span>
        <ChevronDown className="size-4 shrink-0 text-fg-subtle" />
      </Button>
      <Dropdown.Popover className="w-44 rounded-sm">
        <Dropdown.Menu
          aria-label="並び替え"
          className="rounded-sm"
          selectionMode="single"
          selectedKeys={[sort]}
          onSelectionChange={(keys) => {
            if (keys === 'all') return;
            const key = [...keys][0];
            if (key) onSelect(key as SavedSort);
          }}
        >
          {SORT_OPTIONS.map(({ value, label }) => (
            <Dropdown.Item key={value} id={value} textValue={label}>
              <Label>{label}</Label>
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

/**
 * 保存記事カードのアクション。ページ種別(例: /bookmarks のブックマーク)の解除は親の Undo フローに
 * 委譲し、もう一方の種別は ArticleActions と同じ楽観更新(ログイン)/ localStorage(ゲスト)で扱う。
 * ページ種別のボタンは一覧に表示されている間は常に「保存済み」(解除中カードはフェードで消える)。
 */
function SavedCardActions({
  articleId,
  kind,
  isGuest,
  otherInitial,
  onUnsave,
}: {
  articleId: string;
  kind: SavedKind;
  isGuest: boolean;
  otherInitial: boolean;
  onUnsave: () => void;
}) {
  const otherKind: SavedKind = kind === 'bookmark' ? 'favorite' : 'bookmark';
  const guestOther = useGuestSaves(otherKind);
  const [otherActive, setOtherActive] = useState(otherInitial);
  const [, startTransition] = useTransition();

  const otherIsActive = isGuest ? guestOther.has(articleId) : otherActive;

  function toggleOther() {
    if (isGuest) {
      guestOther.toggle(articleId);
      return;
    }
    const next = !otherActive;
    setOtherActive(next);
    startTransition(async () => {
      const result =
        otherKind === 'bookmark'
          ? await setBookmarkAction({ articleId, bookmarked: next })
          : await setFavoriteAction({ articleId, favorited: next });
      if (!result.ok) {
        setOtherActive(!next);
        toast.error(
          otherKind === 'bookmark'
            ? 'あとで読むの更新に失敗しました'
            : 'お気に入りの更新に失敗しました',
        );
      }
    });
  }

  return (
    <ActionButtons
      bookmarked={kind === 'bookmark' ? true : otherIsActive}
      favorited={kind === 'favorite' ? true : otherIsActive}
      onBookmark={kind === 'bookmark' ? onUnsave : toggleOther}
      onFavorite={kind === 'favorite' ? onUnsave : toggleOther}
      disabled={isGuest && !guestOther.ready}
    />
  );
}
