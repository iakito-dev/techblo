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
