import { Building2, CircleHelp, History, Palette, Rss } from 'lucide-react';
import { cookies } from 'next/headers';
import { CurrentThemeLabel } from '@/components/layout/theme-segment';
import { AccountCard } from '@/features/auth/components/account-card';
import { getSession } from '@/features/auth/server';
import { getCompanies } from '@/features/feed/web/queries';
import { readUnsubscribedFrom } from '@/features/subscriptions/web/guest-subscriptions';
import { getSubscriptionSettings } from '@/features/subscriptions/web/queries';
import { MAX_FEEDS_PER_USER } from '@/features/user-feeds/application/errors';
import { getUserFeeds } from '@/features/user-feeds/web/queries';
import { asUserId } from '@/shared/type-utils';
import { SettingsMenuRow } from './settings-menu-row';

/**
 * モバイル設定 index のメニュー(ドリルダウンの入口)。
 * 上部にアカウント(ゲストは登録CTA / ログイン時はアカウント情報)、続いて
 * 企業 / マイフィード / 表示 / 閲覧履歴 / サポートの行を出す。各行の右には現在値を出す
 * (企業は「表示中/全体」、マイフィードは「登録数/上限」、表示はテーマ名)。閲覧履歴は下部タブに枠が無いため、
 * モバイルの入口をここに置く(デスクトップはサイドバーのライブラリ)。各行の件数はここでサーバー取得する
 * (queries は 'use cache' 済みで、遷移先のサブページと取得が共有される)。
 * マイフィードはログイン専用機能だが、導線はゲストにも見せる
 * (ゲストは件数の代わりに「ログインで利用」を出し、遷移先でログイン案内する)。
 */
export async function SettingsMobileMenu() {
  const session = await getSession();

  let companyCount: string;
  // ゲストは件数を持たないので、マイフィード行は補助テキスト無しで出す。
  let feedCount: string | undefined;
  if (session) {
    const userId = asUserId(session.user.id);
    const [settings, feeds] = await Promise.all([
      getSubscriptionSettings(userId),
      getUserFeeds(userId),
    ]);
    companyCount = `${settings.filter((s) => s.enabled).length}/${settings.length}`;
    feedCount = `${feeds.length}/${MAX_FEEDS_PER_USER}`;
  } else {
    // ゲストの OFF 企業は Cookie にある(フィード取得と同じ読み方)。
    const [companies, cookieStore] = await Promise.all([getCompanies(), cookies()]);
    const disabled = new Set(readUnsubscribedFrom((name) => cookieStore.get(name)?.value));
    const enabled = companies.filter((c) => !disabled.has(c.slug)).length;
    companyCount = `${enabled}/${companies.length}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <AccountCard />
      <nav
        aria-label="設定メニュー"
        className="divide-y divide-border-default overflow-hidden rounded-lg border border-border-default bg-bg-surface"
      >
        <SettingsMenuRow
          href="/settings/companies"
          icon={Building2}
          label="表示する企業"
          value={companyCount}
        />
        <SettingsMenuRow href="/settings/feeds" icon={Rss} label="マイフィード" value={feedCount} />
        <SettingsMenuRow
          href="/settings/appearance"
          icon={Palette}
          label="表示"
          value={<CurrentThemeLabel />}
        />
        <SettingsMenuRow href="/history" icon={History} label="閲覧履歴" />
        <SettingsMenuRow href="/settings/support" icon={CircleHelp} label="サポート" />
      </nav>
    </div>
  );
}
