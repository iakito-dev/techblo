'use client';

import { Button } from '@heroui/react';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CompanyFavicon } from '@/components/article/company-favicon';
import { SettingsSection } from '@/components/ui/settings-section';
import { trackSubscriptionChange } from '../track-subscription';
import { useGuestSubscriptions } from '../use-guest-subscriptions';
import { SubscriptionToggle } from './subscription-toggle';

/** ゲスト用の購読リストが必要とする企業情報(DTO のサブセット)。 */
export type GuestSubscriptionCompany = {
  slug: string;
  name: string;
  siteUrl: string;
};

/**
 * ゲスト(未ログイン)の購読企業リスト。ログイン版 SubscriptionList と同じ見た目だが、
 * 状態は Server Action ではなく Cookie(useGuestSubscriptions)に保存する。
 * Cookie はサーバーのフィード取得も読むため、OFF にした企業は即フィードから外れる。
 * 既定は全社購読(Cookie 未設定)。ログイン時は DB へ移行する想定(ADR-0017)。
 */
export function GuestSubscriptionList({ companies }: { companies: GuestSubscriptionCompany[] }) {
  const { isDisabled, toggle, setAll, ready } = useGuestSubscriptions();
  const [query, setQuery] = useState('');

  const enabledCount = companies.filter((c) => !isDisabled(c.slug)).length;
  const allSlugs = useMemo(() => companies.map((c) => c.slug), [companies]);

  // Cookie は slug だけを持つので companyId は null で送る。
  function toggleCompany(slug: string) {
    trackSubscriptionChange({ companyId: null, slug }, isDisabled(slug), {
      isGuest: true,
      bulk: false,
    });
    toggle(slug);
  }

  function setAllCompanies(enabled: boolean) {
    for (const c of companies) {
      if (isDisabled(c.slug) === enabled) {
        trackSubscriptionChange({ companyId: null, slug: c.slug }, enabled, {
          isGuest: true,
          bulk: true,
        });
      }
    }
    setAll(allSlugs, enabled);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q));
  }, [companies, query]);

  return (
    <SettingsSection
      title={`表示する企業(${enabledCount}/${companies.length})`}
      description="フィードに表示する企業を選びます。非表示にした企業の記事は表示されません。登録すると他の端末にも引き継げます。"
    >
      <div className="sticky top-16 z-20 -mx-1 bg-bg-app px-1 pt-1 pb-3 lg:top-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* 検索はモバイルでは出さない(縦1カラムで一覧でき、一括操作を主にするため)。lg+ のみ表示。 */}
          <div className="relative hidden min-w-44 flex-1 lg:block">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-fg-subtle" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="企業名で検索"
              aria-label="企業名で検索"
              className="h-9 w-full rounded-sm border border-border-default bg-bg-surface pr-3 pl-8 text-sm shadow-xs outline-none placeholder:text-fg-subtle focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            isDisabled={!ready || enabledCount === companies.length}
            onPress={() => setAllCompanies(true)}
            className="rounded-sm bg-bg-surface"
          >
            すべて表示
          </Button>
          <Button
            variant="outline"
            size="sm"
            isDisabled={!ready || enabledCount === 0}
            onPress={() => setAllCompanies(false)}
            className="rounded-sm bg-bg-surface"
          >
            すべて非表示
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-fg-muted text-sm">該当する企業がありません</p>
      ) : (
        <ul className="isolate grid grid-cols-1 gap-2.5 md:grid-cols-2">
          {filtered.map((c) => {
            const enabled = !isDisabled(c.slug);
            return (
              <li
                key={c.slug}
                title={c.siteUrl}
                className="relative flex items-center gap-3 rounded-lg border border-border-default bg-bg-surface px-3.5 py-3 shadow-xs transition-colors hover:bg-bg-surface-2/60"
              >
                <button
                  type="button"
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={() => toggleCompany(c.slug)}
                  className="absolute inset-0 cursor-pointer rounded-lg"
                />
                <span
                  className={`flex min-w-0 flex-1 items-center gap-2.5 transition-opacity ${
                    enabled ? '' : 'opacity-60'
                  }`}
                >
                  <CompanyFavicon url={c.siteUrl} name={c.name} />
                  <span className="truncate font-medium text-sm">{c.name}</span>
                </span>
                <span className="relative z-10">
                  <SubscriptionToggle
                    name={c.name}
                    enabled={enabled}
                    justSaved={false}
                    onChange={() => toggleCompany(c.slug)}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </SettingsSection>
  );
}
