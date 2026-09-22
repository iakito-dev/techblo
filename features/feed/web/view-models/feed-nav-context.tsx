'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useTransition,
} from 'react';

type FeedNavValue = {
  /** フィルタ/並び替えの遷移中か。ツールバーと本文(FeedList)で共有して dim に使う。 */
  isPending: boolean;
  /** URL を更新してフィードを引き直す(ノンブロッキング遷移)。 */
  navigate: (href: string) => void;
  /** navigate と同じだが履歴を積まない(検索のキーストロークごとに戻る履歴を汚さない)。 */
  replace: (href: string) => void;
  /** 切替先の RSC を温める。 */
  prefetch: (href: string) => void;
};

// Provider 外(将来 FeedList が別文脈で使われた場合等)では no-op + 非 pending にして throw を避ける。
const noop: FeedNavValue = {
  isPending: false,
  navigate: () => {},
  replace: () => {},
  prefetch: () => {},
};
const FeedNavContext = createContext<FeedNavValue>(noop);

/**
 * フィードのフィルタ/並び替え遷移を1つの useTransition に集約するプロバイダ。
 *
 * ツールバー(view-model 群)と本文(FeedList)は別の Suspense ツリーにあり、これまで遷移中の
 * pending を共有できなかった。そのため切替時にツールバーだけ薄くなり、本文は「前の内容のまま」で
 * 遅れて差し替わって見えた。ここで遷移を共有し、本文側も同じ isPending で dim できるようにする。
 */
export function FeedNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (href: string) => startTransition(() => router.push(href)),
    [router],
  );
  const replace = useCallback(
    (href: string) => startTransition(() => router.replace(href)),
    [router],
  );
  const prefetch = useCallback((href: string) => router.prefetch(href), [router]);

  const value = useMemo<FeedNavValue>(
    () => ({ isPending, navigate, replace, prefetch }),
    [isPending, navigate, replace, prefetch],
  );

  return <FeedNavContext.Provider value={value}>{children}</FeedNavContext.Provider>;
}

export function useFeedNav(): FeedNavValue {
  return useContext(FeedNavContext);
}
