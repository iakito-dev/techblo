'use client';

import { Dropdown, Button as HeroButton, Label } from '@heroui/react';
import { Bookmark, ChevronDown, Heart, type LucideIcon, RefreshCw, Rss } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSession } from '@/features/auth/client';
import { UserMenu } from '@/features/auth/components/user-menu';
import type { PopularPeriod } from '@/features/feed/domain/feed-sort';
import { refreshFeed } from '@/features/feed/web/actions';
import {
  DefaultFeedSearchBox,
  FeedSearchBox,
} from '@/features/feed/web/components/feed-search-box';
import { useFeedPeriod } from '@/features/feed/web/view-models/use-feed-period';
import { useFeedSort } from '@/features/feed/web/view-models/use-feed-sort';
import { cn } from '@/shared/utils';
import { isFeedDefaultView, resolveFeedHeaderTitle } from './feed-header-title';

const PERIOD_OPTIONS: { value: PopularPeriod; label: string }[] = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '今週' },
  { value: 'month', label: '今月' },
  { value: 'all', label: '全期間' },
];

/**
 * デスクトップ(lg+)の上部バー。サイドバーのロゴ帯(h-16)と高さを揃えた sticky ヘッダー。
 * オーバーフローは未実装のプレースホルダ(枠だけ)。
 */
export function FeedTopbar() {
  return (
    <div className="sticky top-0 z-10 hidden h-16 border-border-default border-b bg-bg-app lg:block">
      {/* 本体(コンテンツ)と同じ最大幅(1680px)・中央寄せにして検索バーの左端を揃える(ADR-0035) */}
      <div className="mx-auto flex h-16 max-w-[1680px] items-center gap-3 px-4 md:px-6 lg:px-8">
        {/*
          記事検索(?q=)。ライブ版は useSearchParams を読むため Suspense 内に置き、
          フォールバックは URL を読まない既定版にして静的シェルへプリレンダする(ADR-0019/0022)。
        */}
        <Suspense fallback={<DefaultFeedSearchBox enableShortcut />}>
          <FeedSearchBox enableShortcut />
        </Suspense>

        <div className="ml-auto flex items-center gap-2">
          <RefreshButton />
          <TopbarAuth />
        </div>
      </div>
    </div>
  );
}

/**
 * コンテンツの見出し行(lg+)。左に「タイトル + アイコン」、右に並び替え(流用) + 表示切替/選択(仮)。
 * sort=popular のときだけ集計期間チップを出す。
 */
// アイコン関数/要素は Server→Client 境界をまたげないため、キー文字列で受けてクライアント側で解決する。
const HEADER_ICONS = { feed: Rss, bookmark: Bookmark, favorite: Heart } satisfies Record<
  string,
  LucideIcon
>;

/**
 * title 省略時は URL(?category= 等)から見出しを決める(feed-header-title.ts の純関数)。
 * 呼び出し元(page.tsx)は `/` 専用なので title を渡さず動的にする。他の呼び出し元
 * (dev プレビュー等)は固定タイトルを明示したい場合に title で上書きできる。
 */
export function FeedHeader({
  title,
  icon,
  showControls = false,
}: {
  title?: string;
  icon: keyof typeof HEADER_ICONS;
  showControls?: boolean;
}) {
  const searchParams = useSearchParams();
  const params = {
    category: searchParams.get('category'),
    sort: searchParams.get('sort'),
    period: searchParams.get('period'),
    company: searchParams.get('company'),
    feed: searchParams.get('feed'),
    read: searchParams.get('read'),
    q: searchParams.get('q'),
    tag: searchParams.get('tag'),
  };
  const resolvedTitle = title ?? resolveFeedHeaderTitle(params);
  // トップのセクション表示(既定状態)では戻る必要が無いため、リスト表示のときだけ出す。
  const showBackLink = !isFeedDefaultView(params);
  const Icon = HEADER_ICONS[icon];
  return (
    <div className="mb-5 hidden flex-col gap-1 lg:flex">
      {showBackLink && (
        <Link
          href="/"
          className="w-fit text-fg-muted text-xs transition-colors hover:text-fg-default"
        >
          ← トップ
        </Link>
      )}
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 font-bold text-fg-default text-xl tracking-tight">
          <Icon className="size-5 text-fg-muted" />
          {resolvedTitle}
        </h1>
        {showControls && <SortControl />}
      </div>
    </div>
  );
}

/**
 * 並び替え(新着/人気)。未読/既読フィルタはサイドバー(デスクトップ)/フィルタシート(モバイル)に集約。
 * 集計期間は独立セレクタにせず「人気順」チップに統合する。
 * 人気順チップは「人気順(ソート切替)」+「・期間 ▾(ドロップダウン)」の分割ボタン。
 * 期間部分は新着順中も常時表示し、新着順中に期間を選んだら人気順+その期間で即ソートする。
 * 期間値は URL(useFeedPeriod)が保持するため、新着順へ戻しても次回の人気順で復元される。
 */
function SortControl() {
  const { sort, setSort, prefetchSort, isPending } = useFeedSort();
  const { period, setPeriod, prefetchPeriod } = useFeedPeriod();
  const popularActive = sort === 'popular';
  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? '全期間';

  const chipClass = (active: boolean) =>
    cn(
      'rounded-[0.3rem] font-medium text-sm transition-colors',
      active
        ? 'font-semibold text-fg-default shadow-[inset_0_-2px_0_var(--color-accent)]'
        : 'text-fg-secondary',
    );

  return (
    <div className="flex items-center gap-2">
      {/* 人気順チップがメニュートリガーを兼ねるため tablist ではなく fieldset(グループ)にする */}
      <fieldset
        className={cn(
          'flex items-center rounded-md p-0.5 transition-opacity',
          isPending && 'opacity-60',
        )}
      >
        <legend className="sr-only">並び替え</legend>
        <button
          type="button"
          aria-pressed={!popularActive}
          onClick={() => setSort('latest')}
          onMouseEnter={() => prefetchSort('latest')}
          onFocus={() => prefetchSort('latest')}
          className={cn(chipClass(!popularActive), 'px-3 py-1')}
        >
          新着順
        </button>
        {/* 分割ボタン: 左=ソート切替 / 右=期間メニュー。1つのチップに見えるよう外側に active スタイル */}
        <div className={cn(chipClass(popularActive), 'flex items-center')}>
          <button
            type="button"
            aria-pressed={popularActive}
            onClick={() => setSort('popular')}
            onMouseEnter={() => prefetchSort('popular')}
            onFocus={() => prefetchSort('popular')}
            className="py-1 pl-3"
          >
            人気順
          </button>
          <Dropdown>
            <HeroButton
              variant="ghost"
              aria-label={`集計期間: ${periodLabel}`}
              onHoverStart={() => prefetchSort('popular')}
              className="h-auto min-w-0 gap-0.5 rounded-[0.3rem] py-1 pr-2.5 pl-1 font-medium text-inherit text-sm"
            >
              <span aria-hidden="true" className="text-fg-faint">
                ・
              </span>
              {/* 最長ラベル「全期間」(3字)で幅を固定し、期間切替でチップ幅が動かないようにする */}
              <span className="w-[3em] shrink-0 text-center">{periodLabel}</span>
              <ChevronDown aria-hidden="true" className="size-3.5 text-fg-faint" />
            </HeroButton>
            <Dropdown.Popover className="w-36 rounded-sm">
              <Dropdown.Menu
                aria-label="集計期間"
                className="rounded-sm"
                selectionMode="single"
                selectedKeys={[period]}
                onSelectionChange={(keys) => {
                  if (keys === 'all') return;
                  const key = [...keys][0];
                  if (!key) return;
                  // 新着順中に期間を選んだら、その期間の人気順へ1回の遷移で切り替える
                  // (setPeriod + setSort の2連続遷移はパラメータが落ちる競合になる)
                  setPeriod(key as PopularPeriod, popularActive ? undefined : { sort: 'popular' });
                }}
              >
                {PERIOD_OPTIONS.map(({ value, label }) => (
                  <Dropdown.Item
                    key={value}
                    id={value}
                    textValue={label}
                    onMouseEnter={() =>
                      prefetchPeriod(value, popularActive ? undefined : { sort: 'popular' })
                    }
                    onFocus={() =>
                      prefetchPeriod(value, popularActive ? undefined : { sort: 'popular' })
                    }
                  >
                    <Label>{label}</Label>
                    <Dropdown.ItemIndicator />
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </fieldset>
    </div>
  );
}

/**
 * 「更新」ボタン。クリックで全企業の RSS をその場で取り込み(refreshFeed)、新着を反映する。
 * 取込中はスピン + 無効化。完了後に router.refresh() で RSC を引き直す(feed キャッシュは action 側で無効化済み)。
 */
function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const { ingested, failed, skipped } = await refreshFeed();
        router.refresh();
        if (skipped) {
          toast.info('少し前に更新済みです。最新の記事を表示しています');
        } else if (failed > 0) {
          toast.warning(`新着 ${ingested} 件を取得(${failed} 社は取得失敗)`);
        } else {
          toast.success(
            ingested > 0 ? `新着 ${ingested} 件を取得しました` : '新着はありませんでした',
          );
        }
      } catch {
        toast.error('更新に失敗しました');
      }
    });
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleClick}
            disabled={pending}
            aria-label="最新を取得"
            aria-busy={pending}
          >
            <RefreshCw className={pending ? 'animate-spin' : undefined} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{pending ? '取得中…' : '最新を取得'}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * 上部バー右端のアカウント導線。ゲストはログインボタン、ログイン済みはアバターメニュー。
 * SSR は常に pending 表示なので、マウント前にボタンを出すと hydration mismatch になる
 * (header.tsx / 旧 AppSidebar と同じガード)。
 */
function TopbarAuth() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isPending) {
    return <span className="size-9 animate-pulse rounded-full bg-bg-surface-2" />;
  }
  if (session) {
    return (
      <UserMenu
        name={session.user.name}
        email={session.user.email}
        image={session.user.image ?? null}
      />
    );
  }
  return (
    <Button size="sm" variant="outline" onClick={() => router.push('/login')}>
      ログイン
    </Button>
  );
}
