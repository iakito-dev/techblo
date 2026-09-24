'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  GUEST_UNSUBSCRIBED_COOKIE,
  GUEST_UNSUBSCRIBED_COOKIE_LEGACY,
  readUnsubscribedFrom,
  serializeUnsubscribed,
} from './guest-subscriptions';

// Cookie はサーバー(フィード取得)からも読むため document.cookie に書く(localStorage 不可)。
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 年

/** クライアントから現在のゲスト購読(OFF の slug 群)を読む。ログイン時の移行でも使う。 */
export function readGuestUnsubscribed(): string[] {
  if (typeof document === 'undefined') return [];
  const jar = new Map(
    document.cookie.split('; ').map((row) => {
      const eq = row.indexOf('=');
      return eq === -1 ? [row, ''] : [row.slice(0, eq), row.slice(eq + 1)];
    }),
  );
  // 新キー優先・旧 corpex キーフォールバック(リネーム前データの引き継ぎ)。
  return readUnsubscribedFrom((name) => jar.get(name));
}

function writeCookie(slugs: string[]): void {
  if (typeof document === 'undefined') return;
  // biome-ignore lint/suspicious/noDocumentCookie: 直後の router.refresh() より前に確実に反映させるため同期 API で書く(Cookie Store API は非同期)
  document.cookie = `${GUEST_UNSUBSCRIBED_COOKIE}=${serializeUnsubscribed(slugs)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

/** ゲスト購読 Cookie を消す(ログイン後の DB 移行完了時に呼ぶ)。新旧キー両方を消す。 */
export function clearGuestUnsubscribed(): void {
  if (typeof document === 'undefined') return;
  for (const name of [GUEST_UNSUBSCRIBED_COOKIE, GUEST_UNSUBSCRIBED_COOKIE_LEGACY]) {
    // biome-ignore lint/suspicious/noDocumentCookie: 同上(writeCookie 参照)
    document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
  }
}

/**
 * ゲストの購読設定(Cookie)を読み書きする hook。
 * 保持するのは購読 OFF の slug 集合(未設定=全社 ON)。トグルで Cookie に同期し、
 * フィード(サーバーが Cookie を読む)を反映させるため router.refresh() で RSC を引き直す。
 *
 * SSR/hydration: サーバーと初回描画を一致させるため、初期は「全社 ON」で描画し、
 * mount 後の useEffect で Cookie を読み込んで ready=true にする(useGuestSaves と同型)。
 */
export function useGuestSubscriptions(): {
  /** 購読 OFF か(slug 指定)。 */
  isDisabled: (slug: string) => boolean;
  /** 購読の ON/OFF をトグルして Cookie に同期し、フィードを引き直す。 */
  toggle: (slug: string) => void;
  /** まとめて全 ON / 全 OFF にする(allSlugs は対象の全 slug)。 */
  setAll: (allSlugs: string[], enabled: boolean) => void;
  ready: boolean;
} {
  const router = useRouter();
  const [disabled, setDisabled] = useState<Set<string>>(() => new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDisabled(new Set(readGuestUnsubscribed()));
    setReady(true);
  }, []);

  const commit = useCallback(
    (next: Set<string>) => {
      setDisabled(next);
      writeCookie([...next]);
      router.refresh();
    },
    [router],
  );

  const isDisabled = useCallback((slug: string) => disabled.has(slug), [disabled]);

  const toggle = useCallback(
    (slug: string) => {
      const next = new Set(disabled);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      commit(next);
    },
    [disabled, commit],
  );

  const setAll = useCallback(
    (allSlugs: string[], enabled: boolean) => {
      commit(enabled ? new Set() : new Set(allSlugs));
    },
    [commit],
  );

  return { isDisabled, toggle, setAll, ready };
}
