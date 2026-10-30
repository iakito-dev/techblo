'use client';

import { Button, Dropdown, Label } from '@heroui/react';
import { CalendarDays, ChevronDown, ListFilter, Rss } from 'lucide-react';
import type { Key, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { CompanyFavicon } from '@/components/ui/company-favicon';
import type { FeedSort, PopularPeriod } from '../../domain/feed-sort';
import type { FilterCompany, FilterUserFeed } from '../view-models/feed-filter-options';
import { useFeedNav } from '../view-models/feed-nav-context';
import { useFeedCompany } from '../view-models/use-feed-company';
import { useFeedFilters } from '../view-models/use-feed-filters';
import { useFeedPeriod } from '../view-models/use-feed-period';
import { useFeedSort } from '../view-models/use-feed-sort';
import { RemovableChip } from './feed-chip';
import { DefaultFeedSearchBox, FeedSearchBox } from './feed-search-box';

const PERIOD_OPTIONS: { value: PopularPeriod; label: string }[] = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '今週' },
  { value: 'month', label: '今月' },
  { value: 'all', label: '全期間' },
];

const SORT_OPTIONS: { value: FeedSort; label: string; formLabel: string }[] = [
  { value: 'latest', label: '新着', formLabel: '新着順' },
  { value: 'popular', label: '人気', formLabel: '人気順' },
];

/** FeedControlsView へ渡す表示状態 + 操作。ライブ版/既定版の2ラッパーが組み立てる。 */
type FeedControlsViewProps = {
  /** 記事検索ボックス(?q=)。lg 未満はトップバーが無いためツールバーに置く(ADR-0022)。 */
  searchSlot?: ReactNode;
  /** マイフィードフィルタ(ライブ版のみ。既定版は URL 非依存のため差し込まない)。 */
  userFeedSlot?: ReactNode;
  /** 適用中タグ(?tag=)のチップ。タグ指定時のみ(ライブ版のみ)。ツールバーの下に1行足す。 */
  tagSlot?: ReactNode;
  companies: FilterCompany[];
  sort: FeedSort;
  period: PopularPeriod;
  company: string | null;
  sortPending: boolean;
  periodPending: boolean;
  companyPending: boolean;
  onSort: (next: FeedSort) => void;
  onPeriod: (next: PopularPeriod) => void;
  onCompany: (slug: string | null) => void;
  prefetchSort: (next: FeedSort) => void;
  prefetchPeriod: (next: PopularPeriod) => void;
  prefetchCompany: (slug: string | null) => void;
};

/**
 * タブレット(md〜lg)の1行ツールバー(企業フィルタ + 並び替え + 集計期間)。
 * 並び替えタブ(左)/ 期間ドロップダウン・企業フィルタ(右)。
 * 状態は URL に持たせ、view-model 経由で更新する(再マウントせず page=1 同期。ADR-0016)。
 * 企業フィルタは本番同様の単一選択(?company=slug)。
 * モバイル(<md)は MobileFeedControls(検索行 + チップ行 + 絞り込みシート)に分離した。
 * デスクトップ(lg+)はサイドバー(企業=フォルダ)+ 見出し行の並び替えに委譲する。
 */
export function FeedControls({
  companies,
  userFeeds = [],
}: {
  companies: FilterCompany[];
  userFeeds?: FilterUserFeed[];
}) {
  const { sort, setSort, prefetchSort, isPending: sortPending } = useFeedSort();
  const { period, setPeriod, prefetchPeriod, isPending: periodPending } = useFeedPeriod();
  const { company, setCompany, prefetchCompany, isPending: companyPending } = useFeedCompany();

  // 切替先(もう一方)のソートをマウント時/切替時に温める(ADR-0016)。
  useEffect(() => {
    prefetchSort(sort === 'latest' ? 'popular' : 'latest');
  }, [sort, prefetchSort]);

  return (
    <FeedControlsView
      searchSlot={<FeedSearchBox />}
      userFeedSlot={userFeeds.length > 0 ? <UserFeedFilter userFeeds={userFeeds} /> : undefined}
      tagSlot={<ActiveTagChip />}
      companies={companies}
      sort={sort}
      period={period}
      company={company}
      sortPending={sortPending}
      periodPending={periodPending}
      companyPending={companyPending}
      onSort={setSort}
      onPeriod={setPeriod}
      onCompany={setCompany}
      prefetchSort={prefetchSort}
      prefetchPeriod={prefetchPeriod}
      prefetchCompany={prefetchCompany}
    />
  );
}

/**
 * 既定状態(新着・全期間・すべての企業)のツールバー。FeedToolbar の Suspense フォールバック用。
 *
 * ライブ版は view-model 経由で useSearchParams を読むため、PPR のフォールバック位置に置くと
 * 「Uncached data was accessed outside of <Suspense>」でビルドが落ちる(フォールバック自身は
 * それを受け止める境界を持てない)。こちらは URL を一切読まず既定状態を固定で描画するので
 * 静的シェルにプリレンダでき、リロード直後からツールバーが見える。
 * 操作は useFeedNav(context)経由で即機能する(既定状態起点なので遷移先 URL は固定で組める)。
 * 実際の URL 状態を反映したライブ版がストリームで上書きする(既定 URL では内容一致のため不可視)。
 */
export function DefaultFeedControls({ companies }: { companies: FilterCompany[] }) {
  const { isPending, navigate, prefetch } = useFeedNav();

  const sortHref = (next: FeedSort) => (next === 'popular' ? '/?sort=popular' : '/');
  const companyHref = (slug: string | null) =>
    slug ? `/?company=${encodeURIComponent(slug)}` : '/';
  const periodHref = (next: PopularPeriod) =>
    next === 'all' ? '/?sort=popular' : `/?sort=popular&period=${next}`;

  // ライブ版と同じく、切替先(人気)をマウント時に温める。
  useEffect(() => {
    prefetch('/?sort=popular');
  }, [prefetch]);

  return (
    <FeedControlsView
      searchSlot={<DefaultFeedSearchBox />}
      companies={companies}
      sort="latest"
      period="all"
      company={null}
      sortPending={isPending}
      periodPending={isPending}
      companyPending={isPending}
      onSort={(next) => next !== 'latest' && navigate(sortHref(next))}
      onPeriod={(next) => navigate(periodHref(next))}
      onCompany={(slug) => slug !== null && navigate(companyHref(slug))}
      prefetchSort={(next) => prefetch(sortHref(next))}
      prefetchPeriod={(next) => prefetch(periodHref(next))}
      prefetchCompany={(slug) => prefetch(companyHref(slug))}
    />
  );
}

/**
 * 適用中のタグ(?tag=)を ✕ で解除できるチップとして見せる。タブレット(md〜lg)は見出しが無く、
 * モバイルのチップ行も出ないため、これが無いと「なぜこの記事だけ?」が分からず解除もできない。
 * タグ未指定なら何も描画しない。
 */
function ActiveTagChip() {
  const { tag, removeTag } = useFeedFilters();
  if (tag === null) return null;
  return (
    <div className="mt-2 hidden md:flex">
      <RemovableChip label={`タグ: ${tag}`} onRemove={removeTag} />
    </div>
  );
}

/** ツールバーの見た目本体。状態と操作はすべて props で受ける(URL 非依存)。 */
function FeedControlsView({
  searchSlot,
  userFeedSlot,
  tagSlot,
  companies,
  sort,
  period,
  company,
  sortPending,
  periodPending,
  companyPending,
  onSort,
  onPeriod,
  onCompany,
  prefetchSort,
  prefetchPeriod,
  prefetchCompany,
}: FeedControlsViewProps) {
  return (
    <section aria-label="フィードの絞り込みと並び替え">
      {/* デスクトップ(md+): 1行レイアウト。並び替えタブ(左)/ 期間・企業フィルタ(右) */}
      <div className="hidden items-center justify-between gap-3 md:flex">
        {/*
          並び替えはモバイルと同じ素ボタンのセグメント実装にする。HeroUI v3 の <Tabs>
          (react-aria Collection)はクライアント遷移で本コンポーネントが再マウントされると
          tablist の中身を描画し直せず空になる不具合があり、フィードに戻るとタブが消えていた。
          素の button + role=tab なら遷移後も確実に残る。
        */}
        <div
          role="tablist"
          aria-label="並び替え"
          aria-busy={sortPending}
          className={`relative grid shrink-0 grid-cols-2 rounded-sm bg-bg-surface-2 p-1 transition-opacity ${
            sortPending ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1 left-1 h-0.5 w-[calc(50%-0.25rem)] rounded-full bg-accent transition-transform duration-200 ease-out"
            style={{ transform: sort === 'popular' ? 'translateX(100%)' : 'translateX(0)' }}
          />
          {SORT_OPTIONS.map((option) => {
            const active = sort === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSort(option.value)}
                onMouseEnter={() => prefetchSort(option.value)}
                onFocus={() => prefetchSort(option.value)}
                className={`relative z-10 h-9 min-w-24 rounded-sm px-4 text-center font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  active ? 'text-accent' : 'text-fg-muted'
                }`}
              >
                {option.formLabel}
              </button>
            );
          })}
        </div>

        {searchSlot}

        <div className="flex shrink-0 items-center gap-2">
          {sort === 'popular' && (
            <PeriodDropdown
              period={period}
              onSelect={onPeriod}
              onPrefetch={prefetchPeriod}
              pending={periodPending}
            />
          )}
          <CompanyFilter
            companies={companies}
            company={company}
            onSelect={onCompany}
            onPrefetch={prefetchCompany}
            pending={companyPending}
          />
          {userFeedSlot}
        </div>
      </div>
      {tagSlot}
    </section>
  );
}

/**
 * 企業フィルタ(HeroUI Dropdown / 単一選択)。本番と同じ「すべての企業」+ 各企業の切替。
 * 状態・操作は props で受ける(ライブ版は ?company=slug の view-model、既定版は固定 null)。
 * fullWidth はモバイルでトリガーを全幅に広げる。
 * 開閉・外側クリック・キーボード操作・フォーカス管理は HeroUI に委譲する。
 */
function CompanyFilter({
  companies,
  company,
  onSelect,
  onPrefetch,
  pending,
  fullWidth = false,
}: {
  companies: FilterCompany[];
  company: string | null;
  onSelect: (slug: string | null) => void;
  onPrefetch: (slug: string | null) => void;
  pending: boolean;
  fullWidth?: boolean;
}) {
  const selected = company ? companies.find((c) => c.slug === company) : null;

  // 企業が多いと目的の社を探すのが線形に重くなるため、一定数を超えたら検索で絞り込む。
  const [query, setQuery] = useState('');
  const showSearch = companies.length > 8;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, query]);

  function handleSelectionChange(keys: 'all' | Set<Key>) {
    if (keys === 'all') return;
    const key = [...keys][0];
    onSelect(!key || key === 'all' ? null : String(key));
    setQuery('');
  }

  return (
    <Dropdown>
      <Button
        variant="outline"
        aria-label="企業フィルタ"
        aria-busy={pending}
        className={`h-11 gap-2 rounded-sm bg-bg-surface font-medium shadow-xs transition-opacity ${
          pending ? 'opacity-60' : ''
        } ${fullWidth ? 'min-w-0 flex-1 justify-start' : ''}`}
      >
        {selected ? (
          <CompanyFavicon url={selected.siteUrl} name={selected.name} />
        ) : (
          <ListFilter className="size-4 shrink-0 text-fg-muted" />
        )}
        <span
          className={fullWidth ? 'min-w-0 flex-1 truncate text-left' : 'max-w-[10rem] truncate'}
        >
          {selected ? selected.name : 'すべての企業'}
        </span>
        <ChevronDown className="size-4 shrink-0 text-fg-subtle" />
      </Button>
      <Dropdown.Popover className="flex max-h-[60vh] w-56 flex-col rounded-sm">
        {showSearch && (
          <div className="shrink-0 border-border-default border-b p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="企業を検索"
              aria-label="企業を検索"
              className="h-9 w-full rounded-sm bg-bg-surface-2 px-2.5 text-sm outline-none placeholder:text-fg-subtle focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>
        )}
        <Dropdown.Menu
          aria-label="企業フィルタ"
          className="min-h-0 flex-1 overflow-y-auto rounded-sm"
          selectionMode="single"
          selectedKeys={[company ?? 'all']}
          onSelectionChange={handleSelectionChange}
        >
          {!query && (
            <Dropdown.Item
              id="all"
              textValue="すべての企業"
              onMouseEnter={() => onPrefetch(null)}
              onFocus={() => onPrefetch(null)}
            >
              <Label>すべての企業</Label>
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          )}
          {filtered.map((c) => (
            <Dropdown.Item
              key={c.slug}
              id={c.slug}
              textValue={c.name}
              onMouseEnter={() => onPrefetch(c.slug)}
              onFocus={() => onPrefetch(c.slug)}
            >
              <CompanyFavicon url={c.siteUrl} name={c.name} />
              <Label>{c.name}</Label>
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          ))}
          {query && filtered.length === 0 && (
            <Dropdown.Item id="__empty" isDisabled textValue="該当なし">
              <Label className="text-fg-muted">該当する企業がありません</Label>
            </Dropdown.Item>
          )}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

/**
 * マイフィード(プライベートRSS)フィルタ(HeroUI Dropdown / 複数選択)。企業フィルタの隣に出す。
 * 状態は ?feed=id,id(useFeedFilters)。企業と独立して選べ、選択中は記事を own フィードに絞る(ADR-0014)。
 * ライブ版(URL 依存)からのみ描画する。
 */
function UserFeedFilter({ userFeeds }: { userFeeds: FilterUserFeed[] }) {
  const { userFeeds: selectedIds, toggleUserFeed, isPending } = useFeedFilters();
  const selected = new Set(selectedIds);
  const count = userFeeds.filter((f) => selected.has(f.id)).length;

  return (
    <Dropdown>
      <Button
        variant="outline"
        aria-label="マイフィードフィルタ"
        aria-busy={isPending}
        className={`h-11 gap-2 rounded-sm bg-bg-surface font-medium shadow-xs transition-opacity ${
          isPending ? 'opacity-60' : ''
        }`}
      >
        <Rss className="size-4 shrink-0 text-fg-muted" />
        <span className="max-w-[10rem] truncate">
          {count > 0 ? `マイフィード(${count})` : 'マイフィード'}
        </span>
        <ChevronDown className="size-4 shrink-0 text-fg-subtle" />
      </Button>
      <Dropdown.Popover className="flex max-h-[60vh] w-56 flex-col rounded-sm">
        <Dropdown.Menu
          aria-label="マイフィードフィルタ"
          className="min-h-0 flex-1 overflow-y-auto rounded-sm"
          selectionMode="multiple"
          selectedKeys={selectedIds}
          // 複数選択は1クリックで1件だけ変わる。新旧の差分(対称差)をトグルする。
          onSelectionChange={(keys) => {
            if (keys === 'all') return;
            const next = new Set([...keys].map(String));
            for (const f of userFeeds) {
              if (next.has(f.id) !== selected.has(f.id)) toggleUserFeed(f.id);
            }
          }}
        >
          {userFeeds.map((f) => (
            <Dropdown.Item key={f.id} id={f.id} textValue={f.title}>
              <CompanyFavicon url={f.siteUrl ?? ''} name={f.title} />
              <Label>{f.title}</Label>
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

/**
 * 集計期間のドロップダウン(HeroUI Dropdown / 単一選択)。デスクトップで並び替えタブの左に出す。
 */
function PeriodDropdown({
  period,
  onSelect,
  onPrefetch,
  pending,
}: {
  period: PopularPeriod;
  onSelect: (p: PopularPeriod) => void;
  onPrefetch: (p: PopularPeriod) => void;
  pending: boolean;
}) {
  const currentLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? '全期間';

  return (
    <Dropdown>
      <Button
        variant="outline"
        isDisabled={pending}
        aria-label="集計期間"
        className="h-11 shrink-0 gap-1 rounded-sm bg-bg-surface font-medium shadow-xs sm:gap-1.5"
      >
        <CalendarDays className="hidden size-4 shrink-0 text-fg-muted sm:block" />
        <span className="whitespace-nowrap">{currentLabel}</span>
        <ChevronDown className="size-4 shrink-0 text-fg-subtle" />
      </Button>
      <Dropdown.Popover className="w-36 rounded-sm">
        <Dropdown.Menu
          aria-label="集計期間"
          className="rounded-sm"
          selectionMode="single"
          selectedKeys={[period]}
          onSelectionChange={(keys) => {
            if (keys === 'all') return;
            const key = [...keys][0];
            if (key) onSelect(key as PopularPeriod);
          }}
        >
          {PERIOD_OPTIONS.map(({ value, label }) => (
            <Dropdown.Item
              key={value}
              id={value}
              textValue={label}
              onMouseEnter={() => onPrefetch(value)}
              onFocus={() => onPrefetch(value)}
            >
              <Label>{label}</Label>
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
