'use client';

import { createAuthClient } from 'better-auth/react';

/**
 * クライアント側の Better Auth クライアント。
 * baseURL は同一オリジン(/api/auth)を自動解決するため未指定。
 * 詳細仕様: docs/features/auth.md
 */
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;

/** 対応するソーシャルログインプロバイダ(lib/auth.ts の socialProviders と一致させること)。 */
export type SocialProvider = 'google' | 'github' | 'discord';

/** ソーシャル OAuth でログイン。成功時は callbackURL へ遷移する。 */
export function signInWithProvider(provider: SocialProvider, callbackURL = '/') {
  return signIn.social({ provider, callbackURL });
}
