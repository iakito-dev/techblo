import { describe, expect, it } from 'vitest';
import { PERIOD_DAYS, POPULAR_PERIODS } from '../../domain/feed-sort';
import {
  PERIOD_LABEL,
  PERIOD_RECENT_LABEL,
  PERIOD_WITHIN_LABEL,
  periodOptions,
} from './period-labels';

describe('period-labels', () => {
  it('ラベルはローリング窓の日数(1 / 7 / 30 日)を前提にしている', () => {
    // 窓の日数を変えたら表記も見直す(「24時間」「1週間」「1か月」が嘘にならないように)
    expect(PERIOD_DAYS).toEqual({ today: 1, week: 7, month: 30 });
  });

  it('暦を連想させる「今日/今週/今月」を使わない', () => {
    const all = [
      ...Object.values(PERIOD_LABEL),
      ...Object.values(PERIOD_WITHIN_LABEL),
      ...Object.values(PERIOD_RECENT_LABEL),
    ];
    for (const label of all) {
      expect(label).not.toMatch(/今日|今週|今月/);
    }
  });

  it('全期間を含むすべての期間に短い表記と文中表記がある', () => {
    for (const p of POPULAR_PERIODS) {
      expect(PERIOD_LABEL[p]).toBeTruthy();
      expect(PERIOD_RECENT_LABEL[p]).toBeTruthy();
    }
  });

  it('periodOptions は渡した並び順のまま選択肢を作る', () => {
    expect(periodOptions(['all', 'today'])).toEqual([
      { value: 'all', label: '全期間' },
      { value: 'today', label: '24時間' },
    ]);
    expect(periodOptions(['today', 'week', 'month', 'all']).map((o) => o.label)).toEqual([
      '24時間',
      '週間',
      '月間',
      '全期間',
    ]);
  });
});
