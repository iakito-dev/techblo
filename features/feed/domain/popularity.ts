import type { ArticleCounts } from './article';

/**
 * 人気スコアの重み。ここが唯一の定義。
 * infrastructure 層は SQL 化する際にこの重みを参照する(二重定義を避ける)。
 * はてブ(外部シグナル)を主成分にし、内部シグナルが薄くても機能するようにする(ADR-0014)。
 */
export const POPULARITY_WEIGHTS = {
  view: 1,
  bookmark: 2,
  favorite: 3,
  hatena: 4,
} as const;

/**
 * 時間減衰の重力係数(Hacker News 風)。大きいほど新しい記事が優遇される。
 * infrastructure 層の SQL も同じ値を参照する。
 */
export const POPULARITY_GRAVITY = 1.5;

/** 重み付き総和(減衰前のシグナル量)。 */
const weightedSignal = (c: ArticleCounts): number =>
  c.view * POPULARITY_WEIGHTS.view +
  c.bookmark * POPULARITY_WEIGHTS.bookmark +
  c.favorite * POPULARITY_WEIGHTS.favorite +
  c.hatena * POPULARITY_WEIGHTS.hatena;

/**
 * 人気スコア = (重み付きシグナル + 1) / (経過時間[h] + 2)^gravity。
 * 「今の盛り上がり」を出すため時間減衰を掛ける(古い殿堂記事が居座らない)。
 * docs/features/feed.md / ADR-0014。純粋関数なので単体テスト可能。
 *
 * @param ageHours 公開からの経過時間(時間)。負値は 0 に丸める。
 */
export const popularityScore = (c: ArticleCounts, ageHours: number): number =>
  (weightedSignal(c) + 1) / (Math.max(0, ageHours) + 2) ** POPULARITY_GRAVITY;

/**
 * velocity(伸び速度)スコアの窓と減衰(ADR-0018)。
 * 累計ではなく「直近 VELOCITY_WINDOW_HOURS 時間でどれだけ伸びたか」を見る。
 * 「今日」タブの記事はほぼ公開24h以内なので、窓は取得間隔(6h)に合わせて短くし、
 * 公開数時間の記事でも窓内に最低1スナップショットが入るようにする。
 * infrastructure の SQL もこの定数を参照する(二重定義を避ける)。
 */
export const VELOCITY_WINDOW_HOURS = 6;
/** velocity の時間減衰。累計より弱めにし、増加分そのものを主に効かせる。 */
export const TREND_GRAVITY = 1.0;

/**
 * トレンドスコア = (窓内の増加分 + 1) / (経過時間[h] + 2)^TREND_GRAVITY。
 * 「今、伸びている記事」を上位に出す。純粋関数なので単体テスト可能。
 *
 * コールドスタート(公開直後で窓ぶんのスナップショットが無い)では deltaWindow を
 * 算出できないため、呼び出し側で popularityScore(減衰つき累計)にフォールバックする。
 *
 * @param deltaWindow 直近 VELOCITY_WINDOW_HOURS 時間のはてブ増加分。負値は 0 に丸める。
 * @param ageHours 公開からの経過時間(時間)。負値は 0 に丸める。
 */
export const trendScore = (deltaWindow: number, ageHours: number): number =>
  (Math.max(0, deltaWindow) + 1) / (Math.max(0, ageHours) + 2) ** TREND_GRAVITY;
