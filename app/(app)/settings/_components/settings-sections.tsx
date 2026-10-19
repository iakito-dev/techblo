import { Button } from '@heroui/react';
import { ChevronRight, Lock, Plus } from 'lucide-react';
import Link from 'next/link';
import { ThemeSegment } from '@/components/layout/theme-segment';
import { SUPPORT_LINKS } from '@/components/legal/support-links';
import { Button as LinkButton } from '@/components/ui/button';
import { SettingsSection } from '@/components/ui/settings-section';
import { getSession } from '@/features/auth/server';
import { getCompanies } from '@/features/feed/web/queries';
import { GuestSubscriptionList } from '@/features/subscriptions/web/components/guest-subscription-list';
import { SubscriptionList } from '@/features/subscriptions/web/components/subscription-list';
import { getSubscriptionSettings } from '@/features/subscriptions/web/queries';
import { MAX_FEEDS_PER_USER } from '@/features/user-feeds/application/errors';
import { UserFeedList } from '@/features/user-feeds/web/components/user-feed-list';
import { getUserFeeds } from '@/features/user-feeds/web/queries';
import { asUserId } from '@/shared/type-utils';

/**
 * 設定の各セクション(サーバー側 composition)。デスクトップの単一ページ
 * (settings-desktop.tsx)とモバイルの各サブルート(companies/feeds/support)から
 * 同じ実体を再利用する。データ取得は既存の queries をそのまま使う。
 */

/**
 * 購読企業セクション。ログイン時は DB 由来の設定、ゲスト時は公開企業一覧を Cookie 駆動で編集する。
 */
export async function SubscriptionSettings() {
  const session = await getSession();
  if (!session) {
    const companies = await getCompanies();
    return (
      <GuestSubscriptionList
        companies={companies.map((c) => ({ slug: c.slug, name: c.name, siteUrl: c.siteUrl }))}
      />
    );
  }
  const settings = await getSubscriptionSettings(asUserId(session.user.id));
  return <SubscriptionList settings={settings} />;
}

/**
 * マイフィード(プライベートRSS)セクション。
 * ログイン時は登録UI、ゲスト時は「ログインで使える」案内 + ログイン導線を出す
 * (機能はログイン専用だが、導線と価値はゲストにも見せる)。
 *
 * ゲスト時はログイン後と同じ登録UIをロック表示(UserFeedLockedPreview)で見せる。
 * guestCta はロックオーバーレイの CTA。`full`(既定)はログインボタン(モバイルの独立画面
 * /settings/feeds 用)。`inline` はテキストリンク(デスクトップ単一ページ用。上部の
 * アカウント登録カードと CTA を二重化させない)。
 */
export async function UserFeedSettings({
  guestCta = 'full',
}: {
  guestCta?: 'full' | 'inline';
} = {}) {
  const session = await getSession();
  if (!session) return <UserFeedLockedPreview variant={guestCta} />;
  const feeds = await getUserFeeds(asUserId(session.user.id));
  return <UserFeedList feeds={feeds} limit={MAX_FEEDS_PER_USER} />;
}

/**
 * ゲスト向けマイフィード。ログイン後と同じ登録UIをプレビューとして見せ、
 * 鍵アイコン + オーバーレイでロック状態にする(操作は不可)。
 * variant=inline(デスクトップ)はオーバーレイの CTA をテキストリンクにして、
 * 上部のアカウント登録カードと CTA を二重化させない。full(モバイル独立画面)はボタン。
 */
function UserFeedLockedPreview({ variant }: { variant: 'full' | 'inline' }) {
  return (
    <SettingsSection
      title={
        <span className="inline-flex items-center gap-1.5">
          マイフィード
          <Lock className="size-3.5 text-fg-subtle" aria-hidden="true" />
        </span>
      }
      description="好きなブログやサイトの RSS / Atom を登録すると、新着記事がフィード画面に表示されるようになります。"
    >
      {/* プレビューは入力欄 + 2行。min-h と合わせて、ロックオーバーレイ(鍵・文言・CTA)が
          プレビュー内に収まるだけの高さを確保する(1行だとモバイル幅で入力欄に重なる)。 */}
      <div className="relative min-h-44 overflow-hidden rounded-lg">
        {/* ログイン後の登録UIプレビュー(操作不可・ぼかし)。inert でフォーカス・操作を無効化する */}
        <div className="select-none blur-[0.8px]" inert aria-hidden="true">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 min-w-44 flex-1 items-center rounded-sm border border-border-default bg-bg-surface px-3 text-fg-subtle text-sm shadow-xs">
              https://example.com/feed.xml
            </div>
            <Button type="button" size="sm" className="rounded-sm">
              <Plus aria-hidden="true" className="size-4" />
              登録
            </Button>
          </div>
          <div className="mt-2.5 flex items-center gap-3 rounded-lg border border-border-default bg-bg-surface px-3.5 py-3 shadow-xs">
            <span className="size-6 shrink-0 rounded-full bg-bg-surface-2" />
            <span className="flex flex-1 flex-col gap-1.5">
              <span className="h-3.5 w-32 rounded bg-bg-surface-2" />
              <span className="h-3 w-48 rounded bg-bg-surface-2" />
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-3 rounded-lg border border-border-default bg-bg-surface px-3.5 py-3 shadow-xs">
            <span className="size-6 shrink-0 rounded-full bg-bg-surface-2" />
            <span className="flex flex-1 flex-col gap-1.5">
              <span className="h-3.5 w-32 rounded bg-bg-surface-2" />
              <span className="h-3 w-48 rounded bg-bg-surface-2" />
            </span>
          </div>
        </div>

        {/* ロックオーバーレイ */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 rounded-lg bg-bg-app/60 px-4 text-center backdrop-blur-[1px]">
          <span className="grid size-9 place-items-center rounded-full bg-bg-surface shadow-xs ring-1 ring-border-default">
            <Lock className="size-4 text-fg-muted" aria-hidden="true" />
          </span>
          <p className="font-medium text-fg-default text-sm">
            ログインするとマイフィードを使えます
          </p>
          {variant === 'full' ? (
            <LinkButton asChild size="sm">
              <Link href="/login?callbackURL=%2Fsettings%2Ffeeds">ログイン</Link>
            </LinkButton>
          ) : (
            <Link
              href="/login?callbackURL=%2Fsettings%2Ffeeds"
              className="font-medium text-accent text-sm hover:underline"
            >
              ログイン
            </Link>
          )}
        </div>
      </div>
    </SettingsSection>
  );
}

export function SupportSettings() {
  return (
    <SettingsSection
      title="サポート"
      description="サービス紹介、運営情報、個人情報の取り扱い、ご利用条件を確認できます。"
    >
      <nav aria-label="サポート">
        <ul className="divide-y divide-border-default rounded-md border border-border-default bg-bg-surface">
          {SUPPORT_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex min-h-12 items-center gap-3 px-4 py-3 text-fg-secondary text-sm transition-colors hover:bg-bg-surface-2 hover:text-fg-default focus-visible:bg-bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="min-w-0 flex-1 truncate">{link.label}</span>
                <ChevronRight className="size-4 shrink-0 text-fg-subtle" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </SettingsSection>
  );
}

/** 表示(テーマ)セクション。保存先はブラウザ(localStorage)でアカウントには紐づかない。 */
export function AppearanceSettings() {
  return (
    <SettingsSection
      title="表示"
      description="画面の配色を選べます。システムを選ぶと端末の設定に合わせて切り替わります。"
    >
      <ThemeSegment />
    </SettingsSection>
  );
}
