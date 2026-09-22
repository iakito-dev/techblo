'use client';

import { ListFilter, Loader2, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FilterCompany, FilterUserFeed } from '@/components/article/feed-load-more';
import { LogoMark } from '@/components/layout/logo';
import { MOBILE_GUTTER_CLASS } from '@/shared/layout';
import { cn } from '@/shared/utils';
import type { FeedSort, PopularPeriod, ReadFilterMode } from '../../domain/feed-sort';
import { useFeedNav } from '../view-models/feed-nav-context';
import { useFeedFilters } from '../view-models/use-feed-filters';
import { useFeedSearch } from '../view-models/use-feed-search';
import { useFeedSort } from '../view-models/use-feed-sort';
import { RemovableChip } from './feed-chip';
import { FeedFilterSheet } from './feed-filter-sheet';
import { DefaultMobileCategoryTabs, MobileCategoryTabs } from './mobile-category-tabs';

const STATUS_CHIP: Record<Exclude<ReadFilterMode, 'all'>, string> = {
  unread: '未読のみ',
  read: '既読のみ',
};
const PERIOD_CHIP: Record<Exclude<PopularPeriod, 'all'>, string> = {
  today: '24時間以内',
  week: '今週以内',
  month: '今月以内',
};

type MobileFeedHeaderViewProps = {
  companies: FilterCompany[];
  userFeeds: FilterUserFeed[];
  searchField: React.ReactNode;
  categoryTabs: React.ReactNode;
  status: ReadFilterMode;
  period: PopularPeriod;
  companySlugs: string[];
  feedIds: string[];
  sort: FeedSort;
  activeCount: number;
  onOpenFilter: () => void;
  onRemoveStatus: () => void;
  onRemovePeriod: () => void;
  onRemoveCompany: (slug: string) => void;
  onRemoveUserFeed: (id: string) => void;
  onResetSort: () => void;
};

/**
 * モバイル(<md)のフィードヘッダー。
 * - 1 行目: 検索バー(flex-1) + 絞り込みアイコンボタン(44px 角丸・適用時は塗り+バッジ)
 * - 2 行目: カテゴリタブ(横スクロール)
 * - 3 行目: 適用中フィルタ / 人気順の削除可能チップ(1 つ以上あるときだけ)
 *
 * 以前は最下段に「件数 + 並び替えトグル」を常設していたが、件数は絞り込みシートのフッター
 * (「N件の記事を表示」)と重複しており、並び替えもシートに移した(FeedFilterSheet の
 * 「並び替え」セクション)。上部クロームが 1 行ぶん短くなり、その分リストが上に来る。
 * 既定(新着順)はチップを出さず、人気順のときだけチップで状態を見せる(✕ で新着順へ戻る)。
 *
 * フィルタ状態は useFeedFilters(URL)が唯一の真実の源。並び替えは useFeedSort で分離管理する。
 * ライブ版(MobileFeedControls)と PPR 静的シェル用の既定版(DefaultMobileFeedControls)に分ける。
 */
export function MobileFeedControls({
  companies,
  userFeeds = [],
}: {
  companies: FilterCompany[];
  userFeeds?: FilterUserFeed[];
}) {
  const {
    status,
    period,
    companies: companySlugs,
    userFeeds: feedIds,
    activeCount,
    setStatus,
    setPeriod,
    removeCompany,
    removeUserFeed,
  } = useFeedFilters();
  const { sort, setSort } = useFeedSort();
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <>
      <MobileFeedHeaderView
        companies={companies}
        userFeeds={userFeeds}
        searchField={<MobileSearchField />}
        categoryTabs={<MobileCategoryTabs />}
        status={status}
        period={period}
        companySlugs={companySlugs}
        feedIds={feedIds}
        sort={sort}
        activeCount={activeCount}
        onOpenFilter={() => setFilterOpen(true)}
        onRemoveStatus={() => setStatus('all')}
        onRemovePeriod={() => setPeriod('all')}
        onRemoveCompany={removeCompany}
        onRemoveUserFeed={removeUserFeed}
        onResetSort={() => setSort('latest')}
      />
      <FeedFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        companies={companies}
        userFeeds={userFeeds}
      />
    </>
  );
}

/**
 * 既定状態(フィルタ無し)のヘッダー。MobileFeedControls の Suspense フォールバック用。
 * URL を読まず固定 href で遷移する(DefaultFeedControls と同型)。シートは持たない
 * (FeedFilterSheet は useSearchParams を読むため PPR フォールバック位置に置けない)。
 */
export function DefaultMobileFeedControls() {
  return (
    <MobileFeedHeaderView
      companies={[]}
      userFeeds={[]}
      searchField={<DefaultMobileSearchField />}
      categoryTabs={<DefaultMobileCategoryTabs />}
      status="all"
      period="all"
      companySlugs={[]}
      feedIds={[]}
      sort="latest"
      activeCount={0}
      onOpenFilter={() => {}}
      onRemoveStatus={() => {}}
      onRemovePeriod={() => {}}
      onRemoveCompany={() => {}}
      onRemoveUserFeed={() => {}}
      onResetSort={() => {}}
    />
  );
}

function MobileFeedHeaderView({
  companies,
  userFeeds,
  searchField,
  categoryTabs,
  status,
  period,
  companySlugs,
  feedIds,
  sort,
  activeCount,
  onOpenFilter,
  onRemoveStatus,
  onRemovePeriod,
  onRemoveCompany,
  onRemoveUserFeed,
  onResetSort,
}: MobileFeedHeaderViewProps) {
  // 人気順はフィルタではないがヘッダーの状態表示としてはチップ行に出す
  // (絞り込みバッジの数=useFeedFilters の適用数には含めない)。
  const showChips = activeCount > 0 || sort === 'popular';

  return (
    <div className="sticky top-0 z-30 bg-bg-app md:hidden">
      {/*
        1 行目: ロゴマーク + 検索 + 絞り込みアイコン。
        モバイルのフィードは共通 Header(ロゴ帯)を隠すため、ここにマークを置かないと
        他タブ(ロゴ帯あり)から入った瞬間にロゴが消える。ワードマークは幅を食うのでマークのみ。
        既にホームなので遷移先が無く、装飾(aria-hidden)として置く。
      */}
      <div
        className={cn(
          'flex items-center gap-2 pt-[calc(env(safe-area-inset-top,0px)+0.625rem)] pb-2.5',
          MOBILE_GUTTER_CLASS,
        )}
      >
        <LogoMark />
        {searchField}
        <button
          type="button"
          onClick={onOpenFilter}
          aria-haspopup="dialog"
          aria-label={activeCount > 0 ? `絞り込み(${activeCount}件適用中)` : '絞り込み'}
          /* 角丸は入力と同じ 14px(rounded-md)。完全な円だと 44px の面が検索バーの隣で
             独立した丸い島に見えるので、同じ角丸の家族に寄せる。 */
          className={cn(
            'relative grid size-11 shrink-0 touch-manipulation place-items-center rounded-md transition-colors',
            activeCount > 0
              ? 'bg-accent text-fg-inverse'
              : 'text-fg-secondary shadow-[inset_0_0_0_1px_var(--color-border-strong)] active:bg-bg-surface-2',
          )}
        >
          <ListFilter className="size-[18px]" />
          {activeCount > 0 && (
            <span className="absolute -top-1 -right-1 grid min-w-[1.125rem] place-items-center rounded-full bg-fg-default px-1 font-semibold text-[0.625rem] text-bg-surface tabular-nums">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/*
        カテゴリタブ(新着 + 職能軸7種)。検索行の下・sticky ヘッダーの中に置き、
        ヘッダーと一緒に上部へ固定する(横スクロールの1行。ADR-0034 のカテゴリ定義を使う)。
        下罫は sticky ヘッダーとリストの境目。以前は最下段の件数行が持っていたが、
        その行を廃止したのでチップが無いときはここが下端になる。
      */}
      <div className={cn(!showChips && 'border-border-default border-b-[0.5px]')}>
        {categoryTabs}
      </div>

      {/* 3 行目: 適用中フィルタ + 人気順のチップ(1 つ以上のときだけ。0 件なら行ごと非表示) */}
      {showChips && (
        <div
          className={cn(
            'scrollbar-none flex items-center gap-2 overflow-x-auto border-border-default border-b-[0.5px] pb-2',
            MOBILE_GUTTER_CLASS,
          )}
        >
          {sort === 'popular' && <RemovableChip label="人気順" onRemove={onResetSort} />}
          {status !== 'all' && (
            <RemovableChip label={STATUS_CHIP[status]} onRemove={onRemoveStatus} />
          )}
          {period !== 'all' && (
            <RemovableChip label={PERIOD_CHIP[period]} onRemove={onRemovePeriod} />
          )}
          {companySlugs.map((slug) => (
            <RemovableChip
              key={slug}
              label={companies.find((c) => c.slug === slug)?.name ?? slug}
              onRemove={() => onRemoveCompany(slug)}
            />
          ))}
          {feedIds.map((id) => (
            <RemovableChip
              key={id}
              label={userFeeds.find((f) => f.id === id)?.title ?? 'マイフィード'}
              onRemove={() => onRemoveUserFeed(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 検索入力。角丸だけアプリ共通の入力に揃える(pill → rounded-md = 14px)。
 * 共通 Input(デスクトップ検索・設定フォーム)と絞り込みシートの企業検索が 14px なので、
 * ここだけ pill だと同じ「入力」なのに形が違って見えていた。塗り・枠・フォーカス表現は
 * 既存のまま変えない。
 */
const SEARCH_INPUT_CLASS =
  'h-11 w-full rounded-md border border-border-default bg-bg-surface-2 pr-10 pl-9 text-base text-fg-default outline-none placeholder:text-fg-subtle focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-search-cancel-button]:hidden';

/** 検索行の入力本体。状態と操作は props で受ける(URL 非依存)。 */
function MobileSearchFieldView({
  value,
  onChange,
  onClear,
  onSubmit,
  pending,
}: {
  value: string;
  onChange: (value: string, options?: { composing?: boolean }) => void;
  onClear: () => void;
  /** Enter / 検索キーで debounce を待たず即 commit する。 */
  onSubmit: () => void;
  pending: boolean;
}) {
  const composingRef = useRef(false);
  return (
    <div className="relative min-w-0 flex-1">
      <Search className="absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-fg-subtle" />
      <input
        type="search"
        value={value}
        placeholder="記事や企業を検索"
        aria-label="記事や企業を検索"
        aria-busy={pending}
        enterKeyHint="search"
        onChange={(e) =>
          onChange(e.target.value, {
            composing:
              composingRef.current ||
              (e.nativeEvent instanceof InputEvent && e.nativeEvent.isComposing),
          })
        }
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={(e) => {
          composingRef.current = false;
          onChange(e.currentTarget.value);
        }}
        onKeyDown={(e) => {
          // Enter / 検索キー: 即 commit し、フォーカスを外してキーボードを閉じ、
          // 背後でライブ更新済みのフィード結果を見せる(IME 変換確定の Enter は無視)。
          if (e.key !== 'Enter' || composingRef.current) return;
          e.preventDefault();
          onSubmit();
          e.currentTarget.blur();
        }}
        className={SEARCH_INPUT_CLASS}
      />
      {pending ? (
        <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-fg-subtle" />
      ) : value ? (
        <button
          type="button"
          aria-label="検索をクリア"
          onClick={onClear}
          className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 touch-manipulation place-items-center rounded-full text-fg-subtle transition-colors active:bg-bg-surface-3"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

/** ライブ版検索フィールド(?q=)。useFeedSearch の debounce/IME 契約に乗る。 */
function MobileSearchField() {
  const { inputValue, setInputValue, commitNow, clear, isPending } = useFeedSearch();
  return (
    <MobileSearchFieldView
      value={inputValue}
      onChange={setInputValue}
      onClear={clear}
      onSubmit={commitNow}
      pending={isPending}
    />
  );
}

const DEBOUNCE_MS = 300;

/** 既定版検索フィールド。URL を読まず固定形で replace する(DefaultFeedSearchBox と同型)。 */
function DefaultMobileSearchField() {
  const { replace, isPending } = useFeedNav();
  const [value, setValue] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const commit = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      replace(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : '/');
    },
    [replace],
  );
  const onChange = useCallback(
    (next: string, options?: { composing?: boolean }) => {
      setValue(next);
      clearTimeout(timerRef.current);
      if (options?.composing) return;
      timerRef.current = setTimeout(() => commit(next), DEBOUNCE_MS);
    },
    [commit],
  );
  const onClear = useCallback(() => {
    clearTimeout(timerRef.current);
    setValue('');
    commit('');
  }, [commit]);
  const onSubmit = useCallback(() => {
    clearTimeout(timerRef.current);
    commit(value);
  }, [commit, value]);

  return (
    <MobileSearchFieldView
      value={value}
      onChange={onChange}
      onClear={onClear}
      onSubmit={onSubmit}
      pending={isPending}
    />
  );
}
