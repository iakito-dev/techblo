'use client';

import { Clock, Loader2, Search, X } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useFeedNav } from '../view-models/feed-nav-context';
import { useFeedSearch } from '../view-models/use-feed-search';
import { useSearchHistory } from '../view-models/use-search-history';

type SearchBoxViewProps = {
  value: string;
  onChange: (value: string, options?: { composing?: boolean }) => void;
  onClear: () => void;
  /** Enter / 検索キーで debounce を待たず即 commit する。 */
  onSubmit: () => void;
  pending: boolean;
  /** ⌘K / Ctrl+K でフォーカスするグローバルショートカットを有効にするか(デスクトップのトップバーのみ)。 */
  enableShortcut?: boolean;
  /** 最近の検索。省略時(静的シェルのフォールバック)はポップオーバーを出さない。 */
  history?: {
    items: string[];
    onSelect: (term: string) => void;
    onRemove: (term: string) => void;
    onClearAll: () => void;
  };
};

/**
 * 記事検索ボックス(?q=)のライブ版(ADR-0022)。
 * useSearchParams を読むため Suspense 内に置くこと(PPR のフォールバック位置には
 * DefaultFeedSearchBox を使う。FeedControls の2ラッパー構成と同型)。
 */
export function FeedSearchBox({ enableShortcut = false }: { enableShortcut?: boolean }) {
  const { inputValue, setInputValue, commitNow, commitValue, clear, isPending } = useFeedSearch();
  const { history, add, remove, clear: clearHistory } = useSearchHistory();
  return (
    <SearchBoxView
      value={inputValue}
      onChange={setInputValue}
      onClear={clear}
      // 履歴に残すのは明示確定(Enter / 検索キー)だけ。debounce の途中入力は記録しない。
      onSubmit={() => {
        add(inputValue);
        commitNow();
      }}
      pending={isPending}
      enableShortcut={enableShortcut}
      history={{
        items: history,
        onSelect: (term) => {
          add(term);
          commitValue(term);
        },
        onRemove: remove,
        onClearAll: clearHistory,
      }}
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
  history,
}: SearchBoxViewProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const baseId = useId();
  const listboxId = `${baseId}-history`;
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const items = history?.items ?? [];
  const open = focused && value === '' && items.length > 0;
  const activeId = open && activeIndex >= 0 ? `${baseId}-opt-${activeIndex}` : undefined;
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
        role={history ? 'combobox' : undefined}
        aria-expanded={history ? open : undefined}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={activeId}
        aria-autocomplete={history ? 'list' : undefined}
        onFocus={() => {
          setFocused(true);
          setActiveIndex(-1);
        }}
        onBlur={() => setFocused(false)}
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
          if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            const last = items.length - 1;
            setActiveIndex((i) =>
              e.key === 'ArrowDown' ? (i >= last ? 0 : i + 1) : i <= 0 ? last : i - 1,
            );
            return;
          }
          if (e.key === 'Enter') {
            // IME 変換確定の Enter では commit も履歴記録もしない(中間文字列を残さない)
            if (composingRef.current || e.nativeEvent.isComposing) return;
            e.preventDefault();
            const picked = open && activeIndex >= 0 ? items[activeIndex] : undefined;
            if (picked !== undefined) history?.onSelect(picked);
            else onSubmit();
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
      {open && history ? (
        // 候補クリックで input の blur が先に走ると閉じて click が届かないため、
        // ポップオーバー内の mousedown は preventDefault してフォーカスを保つ。
        // biome-ignore lint/a11y/noStaticElementInteractions: フォーカス維持のための mousedown 抑止のみで、操作要素ではない
        <div
          className="absolute top-full right-0 left-0 z-30 mt-1 overflow-hidden rounded-md border border-border-default bg-bg-surface shadow-md"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-between px-3 pt-2 pb-1">
            <span className="font-medium text-fg-muted text-xs">最近の検索</span>
            <button
              type="button"
              tabIndex={-1}
              onClick={history.onClearAll}
              className="rounded-sm px-1 text-fg-subtle text-xs transition-colors hover:bg-bg-surface-2 hover:text-fg-default"
            >
              すべて消去
            </button>
          </div>
          <div id={listboxId} role="listbox" aria-label="最近の検索" className="pb-1">
            {items.map((term, i) => (
              // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/useFocusableInteractive: combobox の option はフォーカスせず aria-activedescendant で指す。キー操作は input 側が担う
              <div
                key={term}
                id={`${baseId}-opt-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-fg-default text-sm ${i === activeIndex ? 'bg-bg-surface-2' : 'hover:bg-bg-surface-2'}`}
                onMouseMove={() => setActiveIndex(i)}
                onClick={() => {
                  history.onSelect(term);
                  inputRef.current?.blur();
                }}
              >
                <Clock className="size-4 shrink-0 text-fg-subtle" />
                <span className="min-w-0 flex-1 truncate">{term}</span>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`「${term}」を履歴から削除`}
                  onClick={(e) => {
                    e.stopPropagation();
                    history.onRemove(term);
                  }}
                  className="grid size-6 shrink-0 place-items-center rounded-sm text-fg-subtle transition-colors hover:text-fg-default"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
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
