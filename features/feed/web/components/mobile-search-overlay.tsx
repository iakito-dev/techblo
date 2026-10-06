'use client';

import { ArrowLeft, Clock, Loader2, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useSearchHistory } from '../view-models/use-search-history';

const DEBOUNCE_MS = 300;

/**
 * モバイルの全画面検索オーバーレイ(ヘッダーの検索アイコンから開く)。
 *
 * ヘッダーは FeedNavProvider の外にあるため、検索ロジックは context 非依存で自己完結させる
 * (useRouter / useSearchParams を直接使い、DefaultFeedSearchBox と同型の自前 debounce)。
 * 入力は ?q= に commit(router.replace で履歴を汚さない)し、背後のフィードが更新される。
 * IME 変換中は中間文字列で commit しない(feed-search-box.tsx と同じガード)。
 */
export function MobileSearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const urlQuery = params.get('q') ?? '';
  const [value, setValue] = useState(urlQuery);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const composingRef = useRef(false);
  const { history, add, remove, clear: clearHistory } = useSearchHistory();

  const commit = useCallback(
    (q: string) => {
      const sp = new URLSearchParams(params);
      const trimmed = q.trim();
      if (trimmed) sp.set('q', trimmed);
      else sp.delete('q');
      sp.delete('page');
      const qs = sp.toString();
      startTransition(() => router.replace(qs ? `/?${qs}` : '/'));
    },
    [params, router],
  );

  // 開いたら現在値へ同期し、入力にフォーカスする。
  // urlQuery は開いた瞬間の値で初期化したいので依存に入れない(開閉時のみ実行)。
  // biome-ignore lint/correctness/useExhaustiveDependencies: 開閉時のみ実行
  useEffect(() => {
    if (!open) return;
    setValue(urlQuery);
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function onChange(next: string, composing: boolean) {
    setValue(next);
    clearTimeout(timerRef.current);
    if (composing) return;
    timerRef.current = setTimeout(() => commit(next), DEBOUNCE_MS);
  }

  function clear() {
    clearTimeout(timerRef.current);
    setValue('');
    commit('');
    inputRef.current?.focus();
  }

  // Enter / 検索キー: 即 commit してオーバーレイを閉じ、結果のフィードを見せる
  // (IME 変換確定の Enter は無視する)。
  function onSubmit() {
    clearTimeout(timerRef.current);
    // 履歴に残すのは明示確定(Enter / 検索キー / 履歴タップ)だけ。debounce の途中入力は記録しない。
    add(value);
    commit(value);
    onClose();
  }

  function selectHistory(term: string) {
    clearTimeout(timerRef.current);
    add(term);
    setValue(term);
    commit(term);
    onClose();
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-surface lg:hidden">
      <div className="flex items-center gap-2 border-border-default border-b px-3 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-2">
        <button
          type="button"
          onClick={onClose}
          aria-label="検索を閉じる"
          className="grid size-11 shrink-0 touch-manipulation place-items-center rounded-full text-fg-secondary transition-colors active:bg-bg-surface-2"
        >
          <ArrowLeft className="size-[18px]" />
        </button>
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-fg-subtle" />
          <input
            ref={inputRef}
            type="search"
            value={value}
            placeholder="記事を検索"
            aria-label="記事を検索"
            aria-busy={isPending}
            enterKeyHint="search"
            onChange={(e) =>
              onChange(
                e.target.value,
                composingRef.current ||
                  (e.nativeEvent instanceof InputEvent && e.nativeEvent.isComposing),
              )
            }
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={(e) => {
              composingRef.current = false;
              onChange(e.currentTarget.value, false);
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' || composingRef.current) return;
              e.preventDefault();
              onSubmit();
            }}
            className="h-11 w-full rounded-md border border-border-default bg-bg-surface-2 pr-10 pl-9 text-base outline-none placeholder:text-fg-subtle focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-search-cancel-button]:hidden"
          />
          {isPending ? (
            <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-fg-subtle" />
          ) : value ? (
            <button
              type="button"
              aria-label="検索をクリア"
              onClick={clear}
              className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-full text-fg-subtle transition-colors active:bg-bg-surface-3"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {value === '' && history.length > 0 ? (
        <section aria-label="最近の検索" className="flex-1 overflow-y-auto px-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-fg-muted text-xs">最近の検索</h2>
            <button
              type="button"
              onClick={clearHistory}
              className="min-h-11 touch-manipulation px-2 text-fg-subtle text-xs active:bg-bg-surface-2"
            >
              すべて消去
            </button>
          </div>
          <ul>
            {history.map((term) => (
              <li key={term} className="flex items-center">
                <button
                  type="button"
                  onClick={() => selectHistory(term)}
                  className="flex min-h-11 min-w-0 flex-1 touch-manipulation items-center gap-3 rounded-md px-2 text-left text-fg-default text-sm active:bg-bg-surface-2"
                >
                  <Clock className="size-4 shrink-0 text-fg-subtle" />
                  <span className="truncate">{term}</span>
                </button>
                <button
                  type="button"
                  onClick={() => remove(term)}
                  aria-label={`「${term}」を履歴から削除`}
                  className="grid size-11 shrink-0 touch-manipulation place-items-center rounded-full text-fg-subtle active:bg-bg-surface-2"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        // 背後のフィードが ?q= で更新されるため、結果はオーバーレイを閉じて確認する導線にする。
        <button
          type="button"
          onClick={onClose}
          className="flex flex-1 flex-col items-center justify-start gap-1 px-6 pt-10 text-center"
        >
          <p className="text-fg-muted text-sm">
            {value.trim() ? `「${value.trim()}」で絞り込み中` : 'キーワードを入力してください'}
          </p>
          {value.trim() && <p className="text-fg-subtle text-xs">タップして結果を表示</p>}
        </button>
      )}
    </div>,
    document.body,
  );
}
