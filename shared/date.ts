/**
 * 日付ユーティリティ。
 * DB保存は UTC、表示は JST(Asia/Tokyo)。
 */

const JST = 'Asia/Tokyo';

const MIN_MS = 60_000;
const HOUR_MS = MIN_MS * 60;
const DAY_MS = HOUR_MS * 24;

/** 入力を Date に正規化する。 */
// `'use cache'`(cacheComponents)を経た値は Date が ISO 文字列に変わることがあるため、
// 表示側で文字列/数値も受けて Date に揃える(これを怠ると date.getTime() が落ちて表示が空になる)。
export type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatRelative(date: DateInput, now: Date = new Date()): string {
  const diffMs = now.getTime() - toDate(date).getTime();

  if (diffMs < MIN_MS) return 'たった今';
  if (diffMs < HOUR_MS) return `${Math.floor(diffMs / MIN_MS)}分前`;
  if (diffMs < DAY_MS) return `${Math.floor(diffMs / HOUR_MS)}時間前`;
  if (diffMs < DAY_MS * 7) return `${Math.floor(diffMs / DAY_MS)}日前`;

  return formatDate(date);
}

export function formatDate(date: DateInput): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: JST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(toDate(date));
}

export function formatDateTime(date: DateInput): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: JST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(toDate(date));
}
