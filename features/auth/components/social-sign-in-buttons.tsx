'use client';

import { Button } from '@heroui/react';
import { type ReactElement, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { type SocialProvider, signInWithProvider } from '../client';
import { readLastProvider, writeLastProvider } from '../last-provider';

/** Google G ロゴ(公式配色)。アセット追加を避けインライン SVG で描画。 */
function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" className="size-[18px]">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

/** GitHub マーク。currentColor で本文色(ダーク)に追従する。 */
function GitHubIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" className="size-[18px]" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 0C4.03 0 0 4.03 0 9c0 3.98 2.58 7.35 6.16 8.54.45.08.61-.2.61-.43 0-.21-.01-.92-.01-1.67-2.26.41-2.84-.55-3.02-1.06-.1-.26-.55-1.06-.94-1.27-.32-.17-.78-.59-.01-.6.72-.01 1.24.66 1.41.94.83 1.39 2.15.99 2.68.76.08-.6.32-.99.59-1.22-2.01-.23-4.11-1.01-4.11-4.46 0-.99.35-1.8.94-2.43-.09-.23-.41-1.16.09-2.42 0 0 .76-.24 2.5.93a8.5 8.5 0 0 1 2.28-.31c.77 0 1.55.1 2.28.31 1.74-1.18 2.5-.93 2.5-.93.5 1.26.18 2.19.09 2.42.59.63.94 1.43.94 2.43 0 3.47-2.11 4.23-4.12 4.45.33.28.61.83.61 1.67 0 1.21-.01 2.18-.01 2.48 0 .23.16.52.62.43A9.01 9.01 0 0 0 18 9c0-4.97-4.03-9-9-9Z"
      />
    </svg>
  );
}

/** Discord マーク(ブランドカラー #5865F2)。 */
function DiscordIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[18px]" fill="#5865F2">
      <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.036A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.371-.291a.074.074 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.009c.12.099.245.198.372.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
    </svg>
  );
}

type ProviderMeta = {
  name: string;
  Icon: () => ReactElement;
};

const PROVIDERS: Record<SocialProvider, ProviderMeta> = {
  google: { name: 'Google', Icon: GoogleIcon },
  github: { name: 'GitHub', Icon: GitHubIcon },
  discord: { name: 'Discord', Icon: DiscordIcon },
};

/** 表示順の基準。主役はここから抜き出し、残りをこの順でコンパクト表示する。 */
const ORDER: SocialProvider[] = ['google', 'github', 'discord'];

/** 前回利用の記録がないときの既定の主役(最も普及している Google)。 */
const DEFAULT_PRIMARY: SocialProvider = 'google';

/**
 * 全プロバイダのログインボタン。1つを主役(全幅)+ 残りを「または」区切りのコンパクト2列で表示する。
 * 直近に使った方法を localStorage に記録し、再訪時はそれを主役に据えて「前回利用」を明示する
 * (別プロバイダでの二重ログインによる迷いを減らす。アカウント自体は同一メールなら Better Auth が統合)。
 *
 * 認証は OAuth のみで「ログイン/新規登録」の操作は同一のため、文言は中立な「{プロバイダ名} で続ける」に統一する。
 */
export function SocialSignInButtons({ callbackURL }: { callbackURL?: string }) {
  const [pending, setPending] = useState<SocialProvider | null>(null);
  // SSR / マウント前は null 固定で「既定の主役・バッジ無し」を描画し、ハイドレーション不一致を避ける。
  const [lastUsed, setLastUsed] = useState<SocialProvider | null>(null);

  useEffect(() => {
    const stored = readLastProvider();
    if (stored) setLastUsed(stored);
  }, []);

  async function handleSignIn(provider: SocialProvider) {
    setPending(provider);
    // リダイレクト前に記録しておく(成功時はこのページに戻らないため、次回ここで主役判定に使う)。
    writeLastProvider(provider);
    const { error } = await signInWithProvider(provider, callbackURL);
    // 成功時はプロバイダへリダイレクトするためここには戻らない。
    // 戻ってくる = 失敗(ポップアップブロック等)なので解除して通知。
    if (error) {
      setPending(null);
      toast.error('ログインに失敗しました。時間をおいて再度お試しください。');
    }
  }

  const primary = lastUsed ?? DEFAULT_PRIMARY;
  const rest = ORDER.filter((provider) => provider !== primary);
  const PrimaryIcon = PROVIDERS[primary].Icon;

  return (
    <div className="flex flex-col gap-3">
      {lastUsed && <p className="text-fg-secondary text-xs">前回はこちらでログインしました</p>}
      <Button
        variant="outline"
        size="lg"
        className="w-full gap-3 rounded-md"
        isDisabled={pending !== null}
        onPress={() => handleSignIn(primary)}
      >
        <PrimaryIcon />
        {pending === primary ? 'リダイレクト中...' : `${PROVIDERS[primary].name} で続ける`}
      </Button>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border-default" />
        <span className="text-fg-muted text-xs">または</span>
        <span className="h-px flex-1 bg-border-default" />
      </div>

      <div className="flex gap-3">
        {rest.map((provider) => {
          const { name, Icon } = PROVIDERS[provider];
          return (
            <Button
              key={provider}
              variant="outline"
              size="lg"
              className="flex-1 gap-2 rounded-md"
              isDisabled={pending !== null}
              aria-label={`${name} で続ける`}
              onPress={() => handleSignIn(provider)}
            >
              <Icon />
              {pending === provider ? '...' : name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
