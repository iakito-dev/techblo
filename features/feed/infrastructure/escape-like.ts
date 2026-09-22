/**
 * LIKE/ILIKE パターンのメタ文字(% _ \)をエスケープする。
 * ユーザー入力の検索語をそのまま `%...%` に埋め込むと「%」等が任意一致として
 * 解釈されるため、リテラル一致に固定する(ADR-0022)。
 */
export const escapeLike = (input: string): string => input.replace(/[\\%_]/g, '\\$&');
