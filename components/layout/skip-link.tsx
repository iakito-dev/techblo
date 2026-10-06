/**
 * キーボード利用者が Tab 1打でサイドバー / ヘッダーを飛ばして本文へ行くためのリンク。
 * 通常は視覚的に隠し、フォーカスされたときだけ左上に出す。
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only rounded-md border border-border-default bg-bg-surface px-4 py-2 font-medium text-fg-default text-sm shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      本文へスキップ
    </a>
  );
}
