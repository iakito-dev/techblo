'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * ゲスト(未ログイン)の保存状態を localStorage に永続化するクライアントストア。
 * 保存するのは article ID の配列のみ(記事は公開データで ID から引ける)。
 * ログイン後は guest-saves-migrator が DB へ移行し、clearGuestSaves() でクリアする。
 *
 * SSR/hydration: サーバとクライアント初回描画を一致させるため、初期は空集合で描画し、
 * mount 後の useEffect で localStorage を読み込んで ready=true にする。
 */
export type GuestSaveKind = 'bookmark' | 'favorite' | 'read';

const STORAGE_KEYS: Record<GuestSaveKind, string> = {
  bookmark: 'techblo.guest.bookmarks',
  favorite: 'techblo.guest.favorites',
  // 既読(記事ページを開いた記事の ID)。未読/既読フィルタはゲストではこの集合で
  // クライアント側 hide する(サーバーからは見えないため。ADR-0021)。
  read: 'techblo.guest.reads',
};

// 旧名(corpex 時代)のキー。リネーム前にゲストが保存したブックマーク/お気に入り/既読を
// 引き継ぐためのフォールバック。新キーが空のときだけ読む。次回書き込みで新キーへ移る。
const LEGACY_STORAGE_KEYS: Record<GuestSaveKind, string> = {
  bookmark: 'corpex.guest.bookmarks',
  favorite: 'corpex.guest.favorites',
  read: 'corpex.guest.reads',
};

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
}

/** localStorage から ID 配列を読む(hook 外・移行処理から使う純関数)。SSR/失敗時は []。 */
export function readGuestSaves(kind: GuestSaveKind): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = parseIds(window.localStorage.getItem(STORAGE_KEYS[kind]));
    if (current.length > 0) return current;
    // 新キーが空なら旧 corpex キーを参照(リネーム前データの引き継ぎ)。
    return parseIds(window.localStorage.getItem(LEGACY_STORAGE_KEYS[kind]));
  } catch {
    return [];
  }
}

/** ゲストの保存をすべて消す(ログイン後の DB マージ完了時に呼ぶ)。新旧キー両方を消す。 */
export function clearGuestSaves(): void {
  if (typeof window === 'undefined') return;
  try {
    for (const kind of ['bookmark', 'favorite', 'read'] as const) {
      window.localStorage.removeItem(STORAGE_KEYS[kind]);
      window.localStorage.removeItem(LEGACY_STORAGE_KEYS[kind]);
    }
  } catch {
    // 失敗しても致命的でない(次回読み込みで上書きされる)
  }
}

function writeGuestSaves(kind: GuestSaveKind, ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS[kind], JSON.stringify(ids));
  } catch {
    // quota 超過等。保存できなくてもアプリは継続する
  }
}

/**
 * ゲストの集合に ID を1件追加する(冪等)。既読マーク(記事ページを開いた時)用。
 * 既にあれば末尾へ移す(配列順 = 最後に開いた順にして、閲覧履歴の並びに使う。ADR-0041)。
 * hook 外から呼べる純関数。storage イベントは同一タブには発火しないので、購読中の hook には
 * 反映されない(リロード時に反映)— 既読フィルタの即時性は要らないので許容。
 */
export function addGuestSave(kind: GuestSaveKind, id: string): void {
  const current = readGuestSaves(kind);
  if (current.at(-1) === id) return;
  writeGuestSaves(kind, [...current.filter((v) => v !== id), id]);
}

/**
 * ゲストの保存状態を明示的に設定する(冪等)。hook 外から呼べる純関数。
 * トーストの Undo 等、古い render の closure から呼ばれる場面では hook の toggle
 * (その時点の state に依存)ではなくこちらを使う。
 */
export function setGuestSave(kind: GuestSaveKind, id: string, saved: boolean): void {
  const current = readGuestSaves(kind);
  if (current.includes(id) === saved) return;
  writeGuestSaves(kind, saved ? [...current, id] : current.filter((v) => v !== id));
}

/**
 * ゲストの保存状態を読み書きする hook。
 * - has(id): 保存済みか
 * - toggle(id): 反転して localStorage に同期書き込み。新しい保存状態を返す
 * - ready: localStorage 読み込み済みか(false の間は全件未保存として描画)
 */
export function useGuestSaves(kind: GuestSaveKind): {
  has: (id: string) => boolean;
  toggle: (id: string) => boolean;
  ready: boolean;
} {
  const [ids, setIds] = useState<Set<string>>(() => new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIds(new Set(readGuestSaves(kind)));
    setReady(true);

    // 他タブでの変更を反映(同一タブには storage イベントは発火しない)
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEYS[kind]) {
        setIds(new Set(readGuestSaves(kind)));
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [kind]);

  const has = useCallback((id: string) => ids.has(id), [ids]);

  const toggle = useCallback(
    (id: string): boolean => {
      const next = new Set(ids);
      const nowSaved = !next.has(id);
      if (nowSaved) next.add(id);
      else next.delete(id);
      setIds(next);
      writeGuestSaves(kind, [...next]);
      return nowSaved;
    },
    [ids, kind],
  );

  return { has, toggle, ready };
}
