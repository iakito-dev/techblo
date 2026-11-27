/**
 * 企業名の並び比較(企業名順に並べる一覧で使う)。
 * DB の ORDER BY name は照合順序(本番・サンドボックスは C.UTF-8)のバイト順になり、
 * 「AWS Japan」が「Anthropic」より前、「freee」「mercari」など小文字始まりが「ZOZO」より後ろに回る。
 * 大文字小文字を区別せず、英字 → かな・漢字の順に並ぶ日本語の照合で比べる。
 */
const collator = new Intl.Collator('ja', { sensitivity: 'base', numeric: true });

export function compareCompanyNames(a: string, b: string): number {
  return collator.compare(a, b);
}
