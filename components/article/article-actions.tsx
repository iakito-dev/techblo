'use client';

import { Button } from '@heroui/react';
import { Bookmark, Heart } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { setBookmarkAction } from '@/features/bookmarks/web/actions';
import { setFavoriteAction } from '@/features/favorites/web/actions';
import { trackSaveChange } from './track-save';
import { useGuestSaves } from './use-guest-saves';

/**
 * 記事カードの保存系アクション(横断 UI)。
 * feature 境界を越える合成を避けるため、feed ではなくここから bookmarks/favorites の
 * Server Action を呼ぶ(components → features は許容。先例: layout/header → features/auth)。
 *
 * ログイン時(isGuest=false): props 初期値 + Server Action。楽観更新し、失敗時はロールバック + トースト。
 * ゲスト時(isGuest=true): localStorage(useGuestSaves)にトグル保存。ログイン後に DB へ移行される(ADR-0017)。
 * hook ルールのため Authed / Guest を別コンポーネントに分け、見た目は ActionButtons に集約する。
 */
export function ArticleActions({
  articleId,
  initialBookmarked,
  initialFavorited,
  isGuest = false,
}: {
  articleId: string;
  initialBookmarked: boolean;
  initialFavorited: boolean;
  isGuest?: boolean;
}) {
  if (isGuest) return <GuestArticleActions articleId={articleId} />;
  return (
    <AuthedArticleActions
      articleId={articleId}
      initialBookmarked={initialBookmarked}
      initialFavorited={initialFavorited}
    />
  );
}

function AuthedArticleActions({
  articleId,
  initialBookmarked,
  initialFavorited,
}: {
  articleId: string;
  initialBookmarked: boolean;
  initialFavorited: boolean;
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [favorited, setFavorited] = useState(initialFavorited);
  // pending でボタンを無効化しない。optimistic 更新でアイコンは即反転しており、
  // 往復の間ボタンを disabled にすると「押したのに固まった」体感になる(失敗時はロールバック+トースト)。
  const [, startTransition] = useTransition();

  function toggleBookmark() {
    const next = !bookmarked;
    setBookmarked(next);
    // 追加時のみ確認トースト(登録 CTA は出さない)。
    if (next) toast.success('あとで読むに追加しました');
    startTransition(async () => {
      const result = await setBookmarkAction({ articleId, bookmarked: next });
      if (!result.ok) {
        setBookmarked(!next);
        toast.error('あとで読むの更新に失敗しました');
        return;
      }
      trackSaveChange('bookmark', articleId, next, false);
    });
  }

  function toggleFavorite() {
    const next = !favorited;
    setFavorited(next);
    // 追加時のみ確認トースト(ブックマークと同様)。
    if (next) toast.success('お気に入りに追加しました');
    startTransition(async () => {
      const result = await setFavoriteAction({ articleId, favorited: next });
      if (!result.ok) {
        setFavorited(!next);
        toast.error('お気に入りの更新に失敗しました');
        return;
      }
      trackSaveChange('favorite', articleId, next, false);
    });
  }

  return (
    <ActionButtons
      bookmarked={bookmarked}
      favorited={favorited}
      onBookmark={toggleBookmark}
      onFavorite={toggleFavorite}
      disabled={false}
    />
  );
}

function GuestArticleActions({ articleId }: { articleId: string }) {
  const bookmarks = useGuestSaves('bookmark');
  const favorites = useGuestSaves('favorite');
  // localStorage 読み込み前は誤った初期状態で上書きしないよう操作を止める(mount 直後に解除)。
  const ready = bookmarks.ready && favorites.ready;

  return (
    <ActionButtons
      bookmarked={bookmarks.has(articleId)}
      favorited={favorites.has(articleId)}
      onBookmark={() => {
        const saved = bookmarks.toggle(articleId);
        trackSaveChange('bookmark', articleId, saved, true);
        // 追加時のみ確認トースト(登録 CTA は出さない)。
        if (saved) toast.success('あとで読むに追加しました');
      }}
      onFavorite={() => {
        const saved = favorites.toggle(articleId);
        trackSaveChange('favorite', articleId, saved, true);
        // 追加時のみ確認トースト(ブックマークと同様)。
        if (saved) toast.success('お気に入りに追加しました');
      }}
      disabled={!ready}
    />
  );
}

/** 2 つの保存ボタンの見た目(ログイン/ゲスト共通)。保存記事一覧の Undo 対応アクションでも再利用する。 */
export function ActionButtons({
  bookmarked,
  favorited,
  onBookmark,
  onFavorite,
  disabled,
}: {
  bookmarked: boolean;
  favorited: boolean;
  onBookmark: () => void;
  onFavorite: () => void;
  disabled: boolean;
}) {
  // 当たり判定は 44px(size-11)を確保し、ホバーで薄グレーの円を出して可押性を示す。
  // タッチ端末は hover が無いので、押した手応えは active(押下中の塗り + 押し込み)で返す。
  // touch-manipulation は iOS のダブルタップズーム待ち(約 300ms のタップ遅延)を切り、
  // 保存/お気に入りの反応を即時にする(MobileNav と同じ扱い)。
  const buttonClass = (active: boolean) =>
    `relative z-10 size-11 touch-manipulation rounded-full transition-[color,background-color,transform] hover:bg-bg-surface-2 active:scale-90 active:bg-bg-surface-2 ${
      active ? 'text-accent' : 'text-fg-subtle'
    }`;

  // ポインタ操作(タップ/クリック)で押した後はフォーカスを外す。
  // standalone PWA はアプリ切替で復帰したとき最後のフォーカス要素にフォーカスを戻し、
  // react-aria がその focus を「キーボード扱い」と判定してリングが残る。keyboard/virtual
  // (スクリーンリーダー)操作時はフォーカスを保持し、リング表示を維持する。
  const blurAfterPointerPress = (e: { pointerType: string; target: EventTarget | null }) => {
    if (e.pointerType !== 'keyboard' && e.pointerType !== 'virtual') {
      (e.target as HTMLElement | null)?.blur();
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            isIconOnly
            variant="ghost"
            size="lg"
            aria-label="あとで読む"
            data-shortcut-action="bookmark"
            aria-pressed={bookmarked}
            isDisabled={disabled}
            onPress={(e) => {
              blurAfterPointerPress(e);
              onBookmark();
            }}
            className={buttonClass(bookmarked)}
          >
            <Bookmark className="size-6" fill={bookmarked ? 'currentColor' : 'none'} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>あとで読む</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            isIconOnly
            variant="ghost"
            size="lg"
            aria-label="お気に入り"
            data-shortcut-action="favorite"
            aria-pressed={favorited}
            isDisabled={disabled}
            onPress={(e) => {
              blurAfterPointerPress(e);
              onFavorite();
            }}
            // 保存済み状態はアクセント1色に統一する。
            className={buttonClass(favorited)}
          >
            <Heart className="size-6" fill={favorited ? 'currentColor' : 'none'} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>お気に入り</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
