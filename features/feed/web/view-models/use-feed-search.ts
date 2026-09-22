'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFeedNav } from './feed-nav-context';

const DEBOUNCE_MS = 300;

/**
 * 記事検索(?q=)の ViewModel(ADR-0022)。
 * useFeedRead と同型で状態は URL に持たせるが、キー入力ごとに RSC を引かないよう
 * ローカル inputValue + debounce で commit する。commit は replace
 * (キーストロークごとに戻る履歴を汚さない)。空は既定なので URL から消し、page をリセット。
 *
 * IME 対応は呼び出し側(FeedSearchBox)の責務: 変換中は setInputValue だけ呼び、
 * commitNow/スケジュールを抑止するのではなく、ここは「inputValue の変化を debounce して
 * commit する」だけの素朴な契約にする(変換中は onChange ごとに inputValue が変わるため、
 * 呼び出し側が composition 中の commit 抑止フラグを渡す)。
 */
export function useFeedSearch(): {
  /** URL に commit 済みの検索語(表示中フィードの真実)。 */
  query: string;
  /** 入力欄の現在値(未 commit を含む)。 */
  inputValue: string;
  /** 入力値を更新し、debounce 後に URL へ commit する。IME 変換中は commit を保留。 */
  setInputValue: (value: string, options?: { composing?: boolean }) => void;
  /** debounce を待たず現在の入力値を即 commit する(Enter / 検索キー用)。 */
  commitNow: () => void;
  /** 即時クリア(debounce をキャンセルして URL から q を消す)。 */
  clear: () => void;
  isPending: boolean;
} {
  const params = useSearchParams();
  const { isPending, replace } = useFeedNav();
  const urlQuery = params.get('q') ?? '';
  const [inputValue, setValue] = useState(urlQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 戻る/進む等で URL の q が外部から変わったら入力欄を追従させる
  useEffect(() => {
    setValue(urlQuery);
  }, [urlQuery]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const hrefFor = useCallback(
    (q: string) => {
      const sp = new URLSearchParams(params);
      const trimmed = q.trim();
      if (trimmed) sp.set('q', trimmed);
      else sp.delete('q');
      sp.delete('page');
      const qs = sp.toString();
      return qs ? `/?${qs}` : '/';
    },
    [params],
  );

  const commit = useCallback(
    (q: string) => {
      if (q.trim() === urlQuery.trim()) return;
      replace(hrefFor(q));
    },
    [replace, hrefFor, urlQuery],
  );

  const setInputValue = useCallback(
    (value: string, options?: { composing?: boolean }) => {
      setValue(value);
      clearTimeout(timerRef.current);
      // IME 変換中の中間文字列で RSC を引かない(確定後の onChange で改めてスケジュールされる)
      if (options?.composing) return;
      timerRef.current = setTimeout(() => commit(value), DEBOUNCE_MS);
    },
    [commit],
  );

  const commitNow = useCallback(() => {
    clearTimeout(timerRef.current);
    commit(inputValue);
  }, [commit, inputValue]);

  const clear = useCallback(() => {
    clearTimeout(timerRef.current);
    setValue('');
    commit('');
  }, [commit]);

  return { query: urlQuery, inputValue, setInputValue, commitNow, clear, isPending };
}
