import { describe, expect, it } from 'vitest';
import {
  POPULARITY_GRAVITY,
  POPULARITY_WEIGHTS,
  popularityScore,
  TREND_GRAVITY,
  trendScore,
} from './popularity';

const zero = { view: 0, bookmark: 0, favorite: 0, hatena: 0 };

describe('popularityScore', () => {
  it('重み付きシグナル+1 を (経過時間+2)^gravity で割る', () => {
    const c = { view: 10, bookmark: 3, favorite: 2, hatena: 5 };
    const signal = 10 * 1 + 3 * 2 + 2 * 3 + 5 * 4; // 10+6+6+20 = 42
    expect(popularityScore(c, 0)).toBeCloseTo((signal + 1) / 2 ** POPULARITY_GRAVITY);
  });

  it('シグナルが無くても時間減衰の分母で正の値になる', () => {
    expect(popularityScore(zero, 0)).toBeCloseTo(1 / 2 ** POPULARITY_GRAVITY);
    expect(popularityScore(zero, 10)).toBeGreaterThan(0);
  });

  it('はてブが最も高く重み付けされる(4 > 3 > 2 > 1)', () => {
    const h = popularityScore({ ...zero, hatena: 1 }, 0);
    const f = popularityScore({ ...zero, favorite: 1 }, 0);
    const b = popularityScore({ ...zero, bookmark: 1 }, 0);
    const v = popularityScore({ ...zero, view: 1 }, 0);
    expect(h).toBeGreaterThan(f);
    expect(f).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(v);
  });

  it('同じシグナルなら新しい記事ほどスコアが高い(時間減衰)', () => {
    const c = { ...zero, hatena: 10 };
    expect(popularityScore(c, 1)).toBeGreaterThan(popularityScore(c, 100));
  });

  it('負の経過時間は 0 に丸める', () => {
    expect(popularityScore(zero, -5)).toBeCloseTo(popularityScore(zero, 0));
  });

  it('重み定数と計算結果が一致する', () => {
    const c = { view: 1, bookmark: 1, favorite: 1, hatena: 1 };
    const signal =
      POPULARITY_WEIGHTS.view +
      POPULARITY_WEIGHTS.bookmark +
      POPULARITY_WEIGHTS.favorite +
      POPULARITY_WEIGHTS.hatena;
    expect(popularityScore(c, 0)).toBeCloseTo((signal + 1) / 2 ** POPULARITY_GRAVITY);
  });
});

describe('trendScore', () => {
  it('増加分+1 を (経過時間+2)^gravity で割る', () => {
    expect(trendScore(10, 0)).toBeCloseTo((10 + 1) / 2 ** TREND_GRAVITY);
  });

  it('増加が無くても正の値になる(分子の +1)', () => {
    expect(trendScore(0, 0)).toBeCloseTo(1 / 2 ** TREND_GRAVITY);
    expect(trendScore(0, 50)).toBeGreaterThan(0);
  });

  it('同じ増加なら新しい記事ほど高い(時間減衰)', () => {
    expect(trendScore(20, 1)).toBeGreaterThan(trendScore(20, 100));
  });

  it('増加分が大きいほど高い(累計ではなく速度を見る)', () => {
    expect(trendScore(50, 10)).toBeGreaterThan(trendScore(5, 10));
  });

  it('負の増加分(ブクマ削除)は 0 に丸める', () => {
    expect(trendScore(-5, 0)).toBeCloseTo(trendScore(0, 0));
  });

  it('負の経過時間は 0 に丸める', () => {
    expect(trendScore(3, -10)).toBeCloseTo(trendScore(3, 0));
  });
});
