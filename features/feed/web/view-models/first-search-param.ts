/**
 * Next.js の `searchParams` は同じキーが繰り返されると `string[]` になる(`?tag=a&tag=b`)。
 * フィードの絞り込み値は単一の文字列として扱うため、配列のときは最初の値だけを採る
 * (`URLSearchParams.get` と同じ挙動)。型だけ `string` と宣言して配列が素通りすると
 * `.trim()` などで落ち、ページ全体が「読み込みに失敗しました」になる。
 */
export function firstSearchParams<K extends string>(
  raw: Partial<Record<K, string | string[] | undefined>>,
): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {};
  for (const key of Object.keys(raw) as K[]) {
    const value = raw[key] as string | string[] | undefined;
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) out[key] = first;
  }
  return out;
}
