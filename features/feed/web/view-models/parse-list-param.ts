/**
 * カンマ区切りの URL クエリ値(`?company=a,b`)を配列にする。空要素・前後空白は除く。
 * 描画ごとに作り直さないようモジュール関数にしている(useMemo の依存を安定させるため)。
 */
export function parseListParam(raw: string | null): string[] {
  return raw
    ? raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
}
