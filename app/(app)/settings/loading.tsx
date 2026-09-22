import { SubscriptionListSkeleton } from '@/features/subscriptions/web/components/subscription-list-skeleton';
import { SettingsFrame } from './_components/settings-frame';

/**
 * 設定遷移時のローディング。shell は (app)/layout.tsx が保持し、コンテンツ領域だけ差し替わる。
 * タイトルを即表示し、購読一覧は page.tsx の Suspense fallback と同じ skeleton にする
 * (遷移開始〜データ解決まで一貫、レイアウトシフトを抑える)。
 */
export default function Loading() {
  return (
    <SettingsFrame>
      <h1 className="mb-6 font-bold text-xl tracking-tight">設定</h1>
      <SubscriptionListSkeleton />
    </SettingsFrame>
  );
}
