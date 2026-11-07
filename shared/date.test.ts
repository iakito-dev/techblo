import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatRelative } from './date';

const now = new Date('2026-10-29T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('formatRelative', () => {
  it.each([
    [0, 'たった今'],
    [59_999, 'たった今'],
    [MIN, '1分前'],
    [59 * MIN, '59分前'],
    [HOUR, '1時間前'],
    [23 * HOUR, '23時間前'],
    [DAY, '1日前'],
    [6 * DAY, '6日前'],
  ])('%dms 前は %s', (diff, expected) => {
    expect(formatRelative(ago(diff), now)).toBe(expected);
  });

  it('7日以上前は JST の日付表記にする', () => {
    expect(formatRelative(ago(7 * DAY), now)).toBe('2026/10/22');
  });

  it('未来の日時(時計ずれ)は「たった今」に丸める', () => {
    expect(formatRelative(new Date(now.getTime() + HOUR), now)).toBe('たった今');
  });

  it("'use cache' 経由で文字列/数値になった日時も受け付ける", () => {
    expect(formatRelative(ago(2 * HOUR).toISOString(), now)).toBe('2時間前');
    expect(formatRelative(ago(2 * HOUR).getTime(), now)).toBe('2時間前');
  });
});

describe('formatDate / formatDateTime', () => {
  it('UTC の日付またぎを JST(+9h)で表示する', () => {
    const d = new Date('2026-10-28T20:30:00Z');
    expect(formatDate(d)).toBe('2026/10/29');
    expect(formatDateTime(d)).toBe('2026/10/29 05:30');
  });
});
