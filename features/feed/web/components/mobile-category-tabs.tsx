'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { MOBILE_GUTTER_CLASS } from '@/shared/layout';
import { cn } from '@/shared/utils';
import {
  buildCategoryTabHref,
  CATEGORY_TAB_KEYS,
  type CategoryTabKey,
  categoryTabLabel,
  parseCategoryTab,
} from '../view-models/category-tabs';
import { useFeedNav } from '../view-models/feed-nav-context';

const EMPTY_PARAMS = new URLSearchParams();

/**
 * カテゴリタブの見た目本体。選択中は ink 太字 + teal 下線(`SortControl` と同じ表現。
 * 塗りは使わない)。URL 遷移なので `nav` + `<a aria-current>` にし(role=tablist ではない)、
 * クリックは共有の FeedNav 遷移(navigate)に乗せて本文の dim と pending を共有する。
 * href 自体も正しい遷移先を指すため、中クリック/新規タブ開く操作は素の遷移として機能する。
 */
function MobileCategoryTabsView({
  active,
  hrefFor,
}: {
  active: CategoryTabKey;
  hrefFor: (key: CategoryTabKey) => string;
}) {
  const { navigate, prefetch } = useFeedNav();
  const activeRef = useRef<HTMLAnchorElement | null>(null);

  // 選択中のタブが画面外にあるとき(切替直後・別経路からの遷移直後)は見える位置へ寄せる。
  // ヘッダーは URL が変わっても再マウントされないので、選択の変化ごとに寄せ直す。
  // biome-ignore lint/correctness/useExhaustiveDependencies: active の変化をきっかけに ref の要素を寄せ直す
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [active]);

  return (
    <nav
      aria-label="カテゴリで絞り込み"
      className={cn(
        'scrollbar-none flex items-center gap-5 overflow-x-auto pb-2.5 md:hidden',
        MOBILE_GUTTER_CLASS,
      )}
    >
      {CATEGORY_TAB_KEYS.map((key) => {
        const isActive = key === active;
        const href = hrefFor(key);
        return (
          <a
            key={key}
            ref={isActive ? activeRef : undefined}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault();
              navigate(href);
            }}
            onMouseEnter={() => prefetch(href)}
            onFocus={() => prefetch(href)}
            className={cn(
              'flex h-11 shrink-0 touch-manipulation items-center whitespace-nowrap text-sm transition-colors',
              isActive
                ? 'font-semibold text-fg-default shadow-[inset_0_-2px_0_var(--color-accent)]'
                : 'font-medium text-fg-muted',
            )}
          >
            {categoryTabLabel(key)}
          </a>
        );
      })}
    </nav>
  );
}

/** ライブ版。現在の ?category= を読み、他のクエリを保持したまま切り替える。 */
export function MobileCategoryTabs() {
  const params = useSearchParams();
  const active = parseCategoryTab(params.get('category'));
  return (
    <MobileCategoryTabsView active={active} hrefFor={(key) => buildCategoryTabHref(params, key)} />
  );
}

/**
 * 既定版(URL 非依存)。MobileFeedControls の Suspense フォールバック用
 * (DefaultMobileFeedControls と同型)。常に「新着」を選択中として静的シェルにプリレンダする。
 */
export function DefaultMobileCategoryTabs() {
  return (
    <MobileCategoryTabsView
      active="latest"
      hrefFor={(key) => buildCategoryTabHref(EMPTY_PARAMS, key)}
    />
  );
}
