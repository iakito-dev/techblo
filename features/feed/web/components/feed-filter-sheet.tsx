'use client';

import { Check, Search, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CompanyFavicon } from '@/components/article/company-favicon';
import type { FilterCompany, FilterUserFeed } from '@/components/article/feed-load-more';
import {
  type FeedSort,
  type PopularPeriod,
  parseFeedSort,
  parsePeriod,
  parseReadMode,
  type ReadFilterMode,
} from '../../domain/feed-sort';
import { useFeedNav } from '../view-models/feed-nav-context';
import { parseListParam } from '../view-models/parse-list-param';
import { FeedBottomSheet } from './feed-bottom-sheet';

const READ_OPTIONS: { value: ReadFilterMode; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'unread', label: '未読' },
  { value: 'read', label: '既読' },
];

// 仕様の表記(24時間/週間/月間)に合わせる。値は既存の PopularPeriod を維持。
const PERIOD_OPTIONS: { value: PopularPeriod; label: string }[] = [
  { value: 'all', label: '全期間' },
  { value: 'today', label: '24時間' },
  { value: 'week', label: '週間' },
  { value: 'month', label: '月間' },
];

const SORT_OPTIONS: { value: FeedSort; label: string }[] = [
  { value: 'latest', label: '新着順' },
  { value: 'popular', label: '人気順' },
];

const COUNT_DEBOUNCE_MS = 200;

/**
 * モバイルのフィルタ用ボトムシート。ステータス / 期間 / 企業(複数選択)を
 * シート内のローカル state(pending)で編集し、フッターの「N件の記事を表示」で1回の遷移へ
 * まとめて commit する(複数キー跨ぎの後勝ち競合を避けるため URLSearchParams を
 * 直接組み立てて useFeedNav.navigate を1回呼ぶ)。
 *
 * 並び替え(sort)もここで扱う。以前はリスト直上に「件数 + 並び替え」の行を常設していたが、
 * 件数はこのシートのフッター(「N件の記事を表示」)と重複し、モバイルの上部クロームを
 * 1行ぶん余分に占めていたため行ごと廃止した。期間は公開日ウィンドウのフィルタで sort と
 * 直交する(Phase 0 でサーバー側を分離済み)ので、period と sort は互いに触らない。
 */
export function FeedFilterSheet({
  open,
  onOpenChange,
  companies,
  userFeeds = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: FilterCompany[];
  userFeeds?: FilterUserFeed[];
}) {
  const params = useSearchParams();
  const { navigate } = useFeedNav();

  const urlSort = parseFeedSort(params.get('sort') ?? undefined);
  const urlRead = parseReadMode(params.get('read') ?? undefined);
  const urlPeriod = parsePeriod(params.get('period') ?? undefined);
  const companyParam = params.get('company');
  const feedParam = params.get('feed');
  const urlCompanies = useMemo(() => parseListParam(companyParam), [companyParam]);
  const urlFeeds = useMemo(() => parseListParam(feedParam), [feedParam]);

  const [sort, setSort] = useState<FeedSort>(urlSort);
  const [read, setRead] = useState<ReadFilterMode>(urlRead);
  const [period, setPeriod] = useState<PopularPeriod>(urlPeriod);
  const [selected, setSelected] = useState<string[]>(urlCompanies);
  const [selectedFeeds, setSelectedFeeds] = useState<string[]>(urlFeeds);
  const [query, setQuery] = useState('');

  // シートを開くたびに現在の URL 状態へ pending を同期する(前回の未 commit を持ち越さない)。
  // open 立ち上がり時のみ初期化したいので urlXxx は依存に入れない(開いている間の外部変化で pending を壊さない)。
  // biome-ignore lint/correctness/useExhaustiveDependencies: 開いた瞬間の URL を初期値にする
  useEffect(() => {
    if (!open) return;
    setSort(urlSort);
    setRead(urlRead);
    setPeriod(urlPeriod);
    setSelected(urlCompanies);
    setSelectedFeeds(urlFeeds);
    setQuery('');
  }, [open]);

  const filteredCompanies = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? companies.filter((c) => c.name.toLowerCase().includes(q)) : companies;
    // 選択中の企業をリスト最上部にピン留めする(選択状態を見失わないため)。
    const selectedSet = new Set(selected);
    return [...base].sort((a, b) => {
      const aSel = selectedSet.has(a.slug) ? 0 : 1;
      const bSel = selectedSet.has(b.slug) ? 0 : 1;
      return aSel - bSel;
    });
  }, [companies, query, selected]);

  // フッターに出す件数。企業未選択なら全社の合計、選択中なら選択社の合計。
  // 企業スコープのみ反映する(ステータス=ユーザー単位 / 期間=公開日での絞り込みは
  // クライアントに集計値が無く正確に出せないため、リストに表示中の件数と整合する企業合計に揃える)。
  // 選択のたびに即再計算せず 200ms デバウンスする(連続トグル時のチラつき防止。仕様の要件)。
  const targetCount = useMemo(() => {
    // 源未選択なら全企業 + 全マイフィードの合計、選択中はその源だけの合計(リスト表示と整合)。
    const noSource = selected.length === 0 && selectedFeeds.length === 0;
    const companyScope = noSource ? companies : companies.filter((c) => selected.includes(c.slug));
    const feedScope = noSource ? userFeeds : userFeeds.filter((f) => selectedFeeds.includes(f.id));
    return (
      companyScope.reduce((sum, c) => sum + c.articleCount, 0) +
      feedScope.reduce((sum, f) => sum + f.articleCount, 0)
    );
  }, [companies, userFeeds, selected, selectedFeeds]);
  const [debouncedCount, setDebouncedCount] = useState(targetCount);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedCount(targetCount), COUNT_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [targetCount]);

  const hasFilters =
    sort !== 'latest' ||
    read !== 'all' ||
    period !== 'all' ||
    selected.length > 0 ||
    selectedFeeds.length > 0;

  function toggle(slug: string) {
    setSelected((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  function toggleFeed(id: string) {
    setSelectedFeeds((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  }

  function clearAll() {
    setSort('latest');
    setRead('all');
    setPeriod('all');
    setSelected([]);
    setSelectedFeeds([]);
    setQuery('');
  }

  function apply() {
    const sp = new URLSearchParams(params);
    // latest は既定値なので URL から消してきれいに保つ(useFeedSort.hrefFor と同じ規則)。
    if (sort === 'latest') sp.delete('sort');
    else sp.set('sort', sort);
    if (read === 'all') sp.delete('read');
    else sp.set('read', read);
    if (period === 'all') sp.delete('period');
    else sp.set('period', period);
    if (selected.length === 0) sp.delete('company');
    else sp.set('company', selected.join(','));
    if (selectedFeeds.length === 0) sp.delete('feed');
    else sp.set('feed', selectedFeeds.join(','));
    sp.delete('page');
    const qs = sp.toString();
    navigate(qs ? `/?${qs}` : '/');
    onOpenChange(false);
  }

  return (
    <FeedBottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="絞り込み"
      contentClassName="h-[85dvh]"
    >
      <header className="flex shrink-0 items-center justify-between px-5 pb-3">
        <h2 className="font-semibold text-fg-default text-lg">絞り込み</h2>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="絞り込みを閉じる"
          className="-mr-2 grid size-11 touch-manipulation place-items-center rounded-full text-fg-secondary transition-colors active:bg-bg-surface-2"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        <Section label="並び替え">
          <Segmented options={SORT_OPTIONS} value={sort} onChange={(v) => setSort(v as FeedSort)} />
        </Section>

        <Section label="ステータス">
          <Segmented
            options={READ_OPTIONS}
            value={read}
            onChange={(v) => setRead(v as ReadFilterMode)}
          />
        </Section>

        <Section label="期間">
          <Segmented
            options={PERIOD_OPTIONS}
            value={period}
            onChange={(v) => setPeriod(v as PopularPeriod)}
          />
        </Section>

        <Section label="企業">
          <div className="relative mb-2">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="企業名で検索"
              aria-label="企業名で検索"
              className="h-11 w-full rounded-md border border-border-default bg-bg-surface-2 pr-3 pl-9 text-sm outline-none placeholder:text-fg-subtle focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <ul className="-mx-1">
            {filteredCompanies.map((c) => {
              const checked = selected.includes(c.slug);
              return (
                <li key={c.slug}>
                  <button
                    type="button"
                    onClick={() => toggle(c.slug)}
                    aria-pressed={checked}
                    className="flex min-h-12 w-full items-center gap-3 rounded-md px-1 text-left transition-colors active:bg-bg-surface-2"
                  >
                    {/* 複数選択と分かるよう角丸を小さめの四角(チェックボックス)にする。
                        丸だと単一選択ラジオに見える(現行UIの課題)。 */}
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-[5px] border-2 transition-colors ${
                        checked
                          ? 'border-primary bg-primary text-fg-inverse'
                          : 'border-border-strong bg-bg-surface'
                      }`}
                    >
                      {checked && <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />}
                    </span>
                    <CompanyFavicon url={c.siteUrl} name={c.name} />
                    <span className="min-w-0 flex-1 truncate text-fg-default text-sm">
                      {c.name}
                    </span>
                    {checked && (
                      <span className="shrink-0 rounded-pill border border-accent/50 px-2 py-0.5 font-medium text-[0.625rem] text-accent">
                        選択中
                      </span>
                    )}
                    <span className="shrink-0 text-fg-subtle text-xs tabular-nums">
                      {c.articleCount}
                    </span>
                  </button>
                </li>
              );
            })}
            {query && filteredCompanies.length === 0 && (
              <li className="px-1 py-3 text-fg-muted text-sm">該当する企業がありません</li>
            )}
          </ul>
        </Section>

        {/* マイフィード(ユーザー登録RSS)。ログイン&登録済みのみ。企業と独立して絞り込める(ADR-0014)。 */}
        {userFeeds.length > 0 && (
          <Section label="マイフィード">
            <ul className="-mx-1">
              {userFeeds.map((f) => {
                const checked = selectedFeeds.includes(f.id);
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => toggleFeed(f.id)}
                      aria-pressed={checked}
                      className="flex min-h-12 w-full items-center gap-3 rounded-md px-1 text-left transition-colors active:bg-bg-surface-2"
                    >
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded-[5px] border-2 transition-colors ${
                          checked
                            ? 'border-primary bg-primary text-fg-inverse'
                            : 'border-border-strong bg-bg-surface'
                        }`}
                      >
                        {checked && (
                          <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
                        )}
                      </span>
                      <CompanyFavicon url={f.siteUrl ?? ''} name={f.title} />
                      <span className="min-w-0 flex-1 truncate text-fg-default text-sm">
                        {f.title}
                      </span>
                      {checked && (
                        <span className="shrink-0 rounded-pill border border-accent/50 px-2 py-0.5 font-medium text-[0.625rem] text-accent">
                          選択中
                        </span>
                      )}
                      <span className="shrink-0 text-fg-subtle text-xs tabular-nums">
                        {f.articleCount}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}
      </div>

      <footer className="flex shrink-0 items-center gap-3 border-border-default border-t px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={clearAll}
          disabled={!hasFilters}
          className="h-12 shrink-0 rounded-md px-5 font-medium text-fg-secondary text-sm transition-colors active:bg-bg-surface-2 disabled:opacity-40"
        >
          クリア
        </button>
        <button
          type="button"
          onClick={apply}
          className="h-12 flex-1 rounded-md bg-primary font-medium text-base text-fg-inverse transition-colors active:bg-primary-hover"
        >
          <span className="tabular-nums">{debouncedCount.toLocaleString()}</span>件の記事を表示
        </button>
      </footer>
    </FeedBottomSheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="border-border-default border-b py-4 first:pt-2 last:border-b-0">
      <h3 className="mb-2.5 font-semibold text-fg-secondary text-xs tracking-wide">{label}</h3>
      {children}
    </section>
  );
}

/** セグメント形式の単一選択(ステータス・期間・ソートで共用)。 */
function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="grid gap-1 rounded-md bg-bg-surface-2 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`h-11 rounded-sm font-medium text-sm transition-colors ${
              active ? 'bg-bg-surface text-primary shadow-xs' : 'text-fg-muted'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
