'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import {
  addSearchHistory,
  clearSearchHistory,
  parseSearchHistory,
  removeSearchHistory,
  serializeSearchHistory,
} from './search-history';

const STORAGE_KEY = 'techblo.search.history';

const listeners = new Set<() => void>();

function readRaw(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    // プライベートモード等で localStorage が使えない環境では履歴なしとして扱う
    return '';
  }
}

function writeList(list: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeSearchHistory(list));
  } catch {
    // quota 超過・無効化環境では黙って諦める(検索自体は継続する)
    return;
  }
  for (const l of listeners) l();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // 他タブでの変更を反映(同一タブは listeners 経由)
  function onStorage(e: StorageEvent) {
    if (e.key === STORAGE_KEY || e.key === null) onChange();
  }
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * 検索履歴(最近の検索)を端末内 localStorage に保持する hook。
 * useSyncExternalStore でサーバー/ハイドレーション時は空、クライアント確定後に実値へ切り替わる
 * (hydration mismatch を起こさない)。記録は呼び出し側が明示確定時にだけ add する。
 * 操作は都度 storage から読み直して適用するため、古い closure から呼んでも最新に追従する。
 */
export function useSearchHistory(): {
  history: string[];
  add: (term: string) => void;
  remove: (term: string) => void;
  clear: () => void;
} {
  const raw = useSyncExternalStore(subscribe, readRaw, () => '');
  const history = useMemo(() => parseSearchHistory(raw), [raw]);

  const add = useCallback((term: string) => {
    writeList(addSearchHistory(parseSearchHistory(readRaw()), term));
  }, []);
  const remove = useCallback((term: string) => {
    writeList(removeSearchHistory(parseSearchHistory(readRaw()), term));
  }, []);
  const clear = useCallback(() => {
    writeList(clearSearchHistory());
  }, []);

  return { history, add, remove, clear };
}
