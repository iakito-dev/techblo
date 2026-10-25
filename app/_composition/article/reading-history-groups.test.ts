import { describe, expect, it } from 'vitest';
import { groupReadHistory } from './reading-history-groups';

type Entry = { id: string; readAt: string };
const group = (entries: Entry[], now: string) =>
  groupReadHistory(entries, (e) => new Date(e.readAt), new Date(now)).map((g) => ({
    label: g.label,
    ids: g.items.map((e) => e.id),
  }));

describe('groupReadHistory', () => {
  // 2026-10-19(月) 10:00 JST
  const now = '2026-10-19T01:00:00.000Z';

  it('今日 / 昨日 / それ以前の日付でまとめ、入力順を保つ', () => {
    expect(
      group(
        [
          { id: 'a', readAt: '2026-10-19T00:30:00.000Z' },
          { id: 'b', readAt: '2026-10-18T20:00:00.000Z' }, // 10/19 05:00 JST
          { id: 'c', readAt: '2026-10-18T10:00:00.000Z' }, // 10/18 19:00 JST
          { id: 'd', readAt: '2026-10-15T03:00:00.000Z' },
        ],
        now,
      ),
    ).toEqual([
      { label: '今日', ids: ['a', 'b'] },
      { label: '昨日', ids: ['c'] },
      { label: '10月15日(木)', ids: ['d'] },
    ]);
  });

  it('UTC ではなく JST の日付境界で分ける', () => {
    // 10/18 23:59 JST と 10/19 00:01 JST は別の日
    expect(
      group(
        [
          { id: 'today', readAt: '2026-10-18T15:01:00.000Z' },
          { id: 'yesterday', readAt: '2026-10-18T14:59:00.000Z' },
        ],
        now,
      ),
    ).toEqual([
      { label: '今日', ids: ['today'] },
      { label: '昨日', ids: ['yesterday'] },
    ]);
  });

  it('年が違うときは年も付ける', () => {
    expect(group([{ id: 'old', readAt: '2025-12-31T03:00:00.000Z' }], now)).toEqual([
      { label: '2025年12月31日(水)', ids: ['old'] },
    ]);
  });

  it('空配列は空', () => {
    expect(group([], now)).toEqual([]);
  });
});
