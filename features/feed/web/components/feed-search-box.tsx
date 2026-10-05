'use client';

import { Loader2, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useFeedNav } from '../view-models/feed-nav-context';
import { useFeedSearch } from '../view-models/use-feed-search';

type SearchBoxViewProps = {
  value: string;
  onChange: (value: string, options?: { composing?: boolean }) => void;
  onClear: () => void;
  /** Enter / 検索キーで debounce を待たず即 commit する。 */
  onSubmit: () => void;
  pending: boolean;
  /** ⌘K / Ctrl+K でフォーカスするグローバルショートカットを有効にするか(デスクトップのトップバーのみ)。 */
  enableShortcut?: boolean;
};

/**
 * 記事検索ボックス(?q=)のライブ版(ADR-0022)。
 * useSearchParams を読むため Suspense 内に置くこと(PPR のフォールバック位置には
 * DefaultFeedSearchBox を使う。FeedControls の2ラッパー構成と同型)。
 */
export function FeedSearchBox({ enableShortcut = false }: { enableShortcut?: boolean }) {
  const { inputValue, setInputValue, commitNow, clear, isPending } = useFeedSearch();
  return (
    <SearchBoxView
      value={inputValue}
      onChange={setInputValue}
      onClear={clear}
      onSubmit={commitNow}
      pending={isPending}
      enableShortcut={enableShortcut}
    />
  );
}

const DEBOUNCE_MS = 300;

/**
 * 既定状態(検索なし)の検索ボックス。FeedSearchBox の Suspense フォールバック用。
 * URL を一切読まず、既定 URL 起点の固定形(/?q=...)で遷移する(DefaultFeedControls と同型)。
 * 静的シェルにプリレンダされ、リロード直後から入力できる。ライブ版がストリームで上書きする
 * (既定 URL では内容一致のため差し替えは不可視)。
 */
export function DefaultFeedSearchBox({ enableShortcut = false }: { enableShortcut?: boolean }) {
  const { replace, isPending } = useFeedNav();
  const [value, setValue] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const commit = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      replace(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : '/');
    },
    [replace],
  );

  const onChange = useCallback(
    (next: string, options?: { composing?: boolean }) => {
      setValue(next);
      clearTimeout(timerRef.current);
      if (options?.composing) return;
      timerRef.current = setTimeout(() => commit(next), DEBOUNCE_MS);
    },
    [commit],
  );

  const onClear = useCallback(() => {
    clearTimeout(timerRef.current);
    setValue('');
    commit('');
  }, [commit]);

  const onSubmit = useCallback(() => {
    clearTimeout(timerRef.current);
    commit(value);
  }, [commit, value]);

  return (
    <SearchBoxView
      value={value}
      onChange={onChange}
      onClear={onClear}
      onSubmit={onSubmit}
      pending={isPending}
      enableShortcut={enableShortcut}
    />
  );
}

/** 検索ボックスの見た目本体。状態と操作は props で受ける(URL 非依存)。 */
function SearchBoxView({
  value,
  onChange,
  onClear,
  onSubmit,
  pending,
  enableShortcut,
}: SearchBoxViewProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  // IME 変換中フラグ。React の onChange は composition 中も発火するため、
  // 確定前の中間文字列で URL を更新しないようにする。
  const composingRef = useRef(false);

  useEffect(() => {
    if (!enableShortcut) return;
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableShortcut]);

  return (
    <div className="relative max-w-md flex-1">
      <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-fg-subtle" />
      <Input
        ref={inputRef}
        data-feed-search
        type="search"
        value={value}
        placeholder="記事を検索"
        aria-label="記事を検索"
        aria-busy={pending}
        enterKeyHint="search"
        onChange={(e) =>
          onChange(e.target.value, {
            composing:
              composingRef.current ||
              (e.nativeEvent instanceof InputEvent && e.nativeEvent.isComposing),
          })
        }
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={(e) => {
          composingRef.current = false;
          // 確定文字列で改めて commit をスケジュールする(変換中は抑止していたため)
          onChange(e.currentTarget.value);
        }}
        onKeyDown={(e) => {
          // Enter / 検索キー: debounce を待たず即 commit し、フォーカスを外して
          // (タッチ端末では)キーボードを閉じて結果を見せる。
          if (e.key === 'Enter') {
            e.preventDefault();
            onSubmit();
            e.currentTarget.blur();
            return;
          }
          if (e.key !== 'Escape') return;
          if (value) {
            e.preventDefault();
            onClear();
          } else {
            e.currentTarget.blur();
          }
        }}
        // iOS はフォントが 16px 未満だとフォーカス時に自動ズームするため、lg 未満(タッチ想定)は 16px に上げる。
        className="h-9 pr-12 pl-8 text-base lg:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {pending ? (
        <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-fg-subtle" />
      ) : value ? (
        <button
          type="button"
          aria-label="検索をクリア"
          onClick={onClear}
          className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-sm text-fg-subtle transition-colors hover:bg-bg-surface-2 hover:text-fg-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
