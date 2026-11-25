/**
 * NUL 文字(U+0000)を取り除く。
 * Postgres の text は NUL を持てず、URL の `%00` がそのままクエリに渡ると
 * 「invalid byte sequence for encoding "UTF8": 0x00」で 500 になる。
 * ユーザー入力(検索語・タグ・slug)を DB に渡す前の入口で使う。
 */
export function stripNul(value: string): string {
  return value.replaceAll('\u0000', '');
}

export function hasNul(value: string): boolean {
  return value.includes('\u0000');
}

const COUNT_FORMAT = new Intl.NumberFormat('ja-JP');

/**
 * 件数を 3 桁区切りで表記する(`1035` → `1,035`)。はてブ数・記事数は桁が増えると
 * 区切り無しでは一目で読めない。ロケールを固定するのは、サーバー描画とブラウザの既定ロケールが
 * 異なると区切り文字が変わり、ハイドレーションで表記がずれるため。
 */
export function formatCount(value: number): string {
  return COUNT_FORMAT.format(value);
}
