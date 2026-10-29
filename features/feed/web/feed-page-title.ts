const MAX_LABEL = 40;

function clip(value: string): string {
  const chars = [...value];
  return chars.length > MAX_LABEL ? `${chars.slice(0, MAX_LABEL).join('')}…` : value;
}

/**
 * フィード(/)の絞り込み中だけ付けるタブ/履歴用のタイトル。無指定なら undefined(既定タイトル)。
 * 検索やタグを切り替えても全部同じ「テクブロ｜…」だと、複数タブやブラウザ履歴で見分けがつかない。
 * 検索が優先(検索語とタグの併用時は検索語を出す)。
 */
export function feedPageTitle(params: { q?: string; tag?: string }): string | undefined {
  const q = params.q?.trim();
  if (q) return `「${clip(q)}」の検索結果`;
  const tag = params.tag?.trim();
  if (tag) return `#${clip(tag)} の記事`;
  return undefined;
}
