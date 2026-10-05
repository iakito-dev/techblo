'use client';

import {
  Bookmark,
  ChevronRight,
  Circle,
  CircleCheck,
  Hash,
  Heart,
  Keyboard,
  Rss,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type Ref, useEffect, useRef } from 'react';
import { CompanyFavicon } from '@/components/article/company-favicon';
import { useKeyboardShortcutsHelp } from '@/components/layout/keyboard-shortcuts';
import { Logo } from '@/components/layout/logo';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CATEGORY_DEFINITIONS } from '@/shared/categories';
import { cn } from '@/shared/utils';

/** サイドバーに出す企業(購読企業=フォルダ相当)。 */
export type SidebarCompany = {
  slug: string;
  name: string;
  siteUrl: string;
  articleCount: number;
};

/** サイドバーに出すマイフィード(ユーザー登録RSS)。フィルタは ?feed=<id>。 */
export type SidebarUserFeed = {
  id: string;
  title: string;
  siteUrl: string | null;
  articleCount: number;
};

const LIBRARY = [
  { icon: Rss, label: 'フィード', href: '/' },
  { icon: Bookmark, label: 'あとで読む', href: '/bookmarks' },
  { icon: Heart, label: 'お気に入り', href: '/favorites' },
];

// 既読状態フィルタ(?read=unread|read)。再クリックで解除して「すべて」に戻る。
const READ_FILTERS = [
  { icon: Circle, label: '未読', value: 'unread' },
  { icon: CircleCheck, label: '既読', value: 'read' },
] as const;

/**
 * Dewey 風の左サイドバー(lg+ のみ表示)。
 * ロゴ+アカウント / ライブラリ / フィルタ(既読状態 + 購読企業, 実件数) / フォルダ(仮) / カテゴリ / 下部ユーティリティ。
 * 企業フォルダは `/?company=slug` への遷移でフィードを絞り込む。モバイルは Header + MobileNav が担う。
 */
export function AppSidebar({
  companies,
  userFeeds = [],
}: {
  companies: SidebarCompany[];
  userFeeds?: SidebarUserFeed[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openHelp } = useKeyboardShortcutsHelp();
  const activeCompany = searchParams.get('company');
  const activeCategory = searchParams.get('category');
  // タグ欄は廃止したが ?tag= の絞り込みは URL から使えるので、絞り込み中は「フィード」を選択中にしない。
  const activeTag = searchParams.get('tag');
  // ?feed=id,id の選択集合(マイフィードのアクティブ判定)。
  const activeFeeds = new Set(
    (searchParams.get('feed') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

  useEffect(() => {
    for (const { href } of LIBRARY) {
      if (href !== pathname) router.prefetch(href);
    }
  }, [pathname, router]);

  const onFeed = pathname === '/';

  // 選択中のカテゴリ行がスクロール領域外にあるとき(別経路からの遷移直後・カテゴリ切替直後)は
  // 見える位置へ寄せる(モバイルのカテゴリタブと同じ考え方。mobile-category-tabs.tsx)。
  const activeCategoryRef = useRef<HTMLAnchorElement | null>(null);
  useEffect(() => {
    if (onFeed && activeCategory) {
      activeCategoryRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [onFeed, activeCategory]);

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-border-default border-r bg-bg-app lg:flex">
      {/* 上部: ロゴ */}
      <div className="flex h-16 shrink-0 items-center px-4">
        <Logo showOrigin />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-5 px-3 pb-4">
          {/* ライブラリ */}
          <Section label="ライブラリ">
            {LIBRARY.map(({ icon: Icon, label, href }) => {
              const active =
                href === '/'
                  ? onFeed && !activeCompany && !activeTag && !activeCategory
                  : pathname.startsWith(href);
              return (
                <NavRow key={href} asLink href={href} icon={Icon} label={label} active={active} />
              );
            })}
          </Section>

          {/* フィルタ: 既読状態(?read=) + 企業(購読企業, 実件数) */}
          <Section label="フィルタ">
            {READ_FILTERS.map(({ icon: Icon, label, value }) => {
              const active = onFeed && searchParams.get('read') === value;
              // フィード上では他のフィルタ(company/sort/period)を保ったまま read だけ切り替える
              const sp = new URLSearchParams(onFeed ? searchParams : undefined);
              if (active) sp.delete('read');
              else sp.set('read', value);
              sp.delete('page');
              const qs = sp.toString();
              return (
                <NavRow
                  key={value}
                  asLink
                  href={qs ? `/?${qs}` : '/'}
                  icon={Icon}
                  label={label}
                  active={active}
                />
              );
            })}

            {/* 企業(クリックで /?company=slug 絞り込み・折りたたみ) */}
            <Collapsible defaultOpen className="mt-1">
              <div className="flex items-center justify-between px-2.5">
                <CollapsibleTrigger className="group flex items-center gap-1 py-1 font-medium text-fg-subtle text-xs outline-none">
                  <ChevronRight className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
                  企業
                </CollapsibleTrigger>
                <span className="text-fg-subtle text-xs tabular-nums">{companies.length}</span>
              </div>
              <CollapsibleContent className="mt-1 flex flex-col gap-0.5">
                {companies.map((c) => {
                  const active = onFeed && activeCompany === c.slug;
                  return (
                    <Link
                      key={c.slug}
                      href={`/?company=${c.slug}`}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors before:absolute before:inset-y-[5px] before:left-0 before:w-0.5 before:rounded-full',
                        active
                          ? 'font-semibold text-fg-default before:bg-accent'
                          : 'text-fg-muted before:bg-transparent hover:text-fg-default',
                      )}
                    >
                      <CompanyFavicon url={c.siteUrl} name={c.name} />
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      <span className="shrink-0 text-fg-subtle text-xs tabular-nums">
                        {c.articleCount}
                      </span>
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>

            {/* マイフィード(ユーザー登録RSS。クリックで /?feed=id 絞り込み)。ログイン&登録済みのみ表示 */}
            {userFeeds.length > 0 && (
              <Collapsible defaultOpen className="mt-1">
                <div className="flex items-center justify-between px-2.5">
                  <CollapsibleTrigger className="group flex items-center gap-1 py-1 font-medium text-fg-subtle text-xs outline-none">
                    <ChevronRight className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
                    マイフィード
                  </CollapsibleTrigger>
                  <span className="text-fg-subtle text-xs tabular-nums">{userFeeds.length}</span>
                </div>
                <CollapsibleContent className="mt-1 flex flex-col gap-0.5">
                  {userFeeds.map((f) => {
                    const active = onFeed && activeFeeds.has(f.id);
                    return (
                      <Link
                        key={f.id}
                        href={`/?feed=${f.id}`}
                        aria-current={active ? 'page' : undefined}
                        title={f.title}
                        className={cn(
                          'relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors before:absolute before:inset-y-[5px] before:left-0 before:w-0.5 before:rounded-full',
                          active
                            ? 'font-semibold text-fg-default before:bg-accent'
                            : 'text-fg-muted before:bg-transparent hover:text-fg-default',
                        )}
                      >
                        <CompanyFavicon url={f.siteUrl ?? ''} name={f.title} />
                        <span className="min-w-0 flex-1 truncate">{f.title}</span>
                        <span className="shrink-0 text-fg-subtle text-xs tabular-nums">
                          {f.articleCount}
                        </span>
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            )}
          </Section>

          {/* フォルダ(一旦空。将来ユーザー定義フォルダを入れる枠) */}
          <Section label="フォルダ">
            <p className="px-2.5 py-1.5 text-fg-subtle text-xs">まだフォルダがありません</p>
          </Section>

          {/* カテゴリ(?category= 絞り込み・職能軸7種。shared/categories.ts が単一の真実の源。ADR-0034)。
              棚(isShelf)・イベント(isShelf=false)の両方を同じ導線で出す。再クリックで解除。 */}
          <Section label="カテゴリ">
            {CATEGORY_DEFINITIONS.map(({ key, label }) => {
              const active = onFeed && activeCategory === key;
              // フィード上では他のフィルタ(company/sort/period 等)を保ったまま category だけ切り替える
              const sp = new URLSearchParams(onFeed ? searchParams : undefined);
              if (active) sp.delete('category');
              else sp.set('category', key);
              sp.delete('page');
              const qs = sp.toString();
              return (
                <NavRow
                  key={key}
                  asLink
                  href={qs ? `/?${qs}` : '/'}
                  icon={Hash}
                  label={label}
                  active={active}
                  linkRef={active ? activeCategoryRef : undefined}
                />
              );
            })}
          </Section>
        </div>
      </ScrollArea>

      {/* 下部ユーティリティ */}
      <div className="shrink-0 border-border-default border-t px-3 py-3">
        <NavRow
          asLink
          href="/settings"
          icon={Settings}
          label="設定"
          active={pathname.startsWith('/settings')}
        />
        <NavRow icon={Keyboard} label="キーボードショートカット" onClick={openHelp} />
      </div>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="px-2 py-1 font-medium text-fg-subtle text-xs uppercase tracking-wider">
        {label}
      </span>
      {children}
    </div>
  );
}

/**
 * サイドバーの1行。asLink+href で遷移リンク、無ければ未実装の no-op 行(薄色プレースホルダ)。
 * count を渡すと右端に件数バッジを出す。
 */
function NavRow({
  icon: Icon,
  label,
  href,
  asLink = false,
  active = false,
  count,
  linkRef,
  onClick,
}: {
  icon: typeof Rss;
  label: string;
  href?: string;
  asLink?: boolean;
  active?: boolean;
  count?: number;
  /** 選択中の行をスクロール領域内に寄せるための ref(カテゴリ行の scrollIntoView 用)。 */
  linkRef?: Ref<HTMLAnchorElement>;
  /** 遷移ではなくダイアログを開く等の操作行。 */
  onClick?: () => void;
}) {
  const inner = (
    <>
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      {count != null && (
        <Badge variant={active ? 'primary' : 'muted'} className="shrink-0">
          {count}
        </Badge>
      )}
    </>
  );

  const base =
    'relative flex items-center gap-2.5 rounded-md px-2.5 py-2 font-medium text-sm transition-colors before:absolute before:inset-y-[5px] before:left-0 before:w-0.5 before:rounded-full';

  if (asLink && href) {
    return (
      <Link
        ref={linkRef}
        href={href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          base,
          active
            ? 'font-semibold text-fg-default before:bg-accent'
            : 'text-fg-muted before:bg-transparent hover:text-fg-default',
        )}
      >
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(base, 'text-fg-muted before:bg-transparent hover:text-fg-default')}
      >
        {inner}
      </button>
    );
  }

  // プレースホルダ(未実装): クリック不可・薄色で「枠だけ」を示す。
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title="準備中"
      className={cn(base, 'cursor-default text-fg-subtle')}
    >
      {inner}
    </button>
  );
}
