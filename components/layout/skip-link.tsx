/**
 * キーボード利用者が Tab 1打でサイドバー / ヘッダーを飛ばして本文へ行くためのリンク。
 * 通常は視覚的に隠し、フォーカスされたときだけ左上に出す。
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="border-border-default bg-bg-surface text-fg-default focus-visible:ring-accent sr-only rounded-md border px-4 py-2 text-sm font-medium shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus-visible:ring-2 focus-visible:outline-none"
    >
      本文へスキップ
    </a>
  );
}
