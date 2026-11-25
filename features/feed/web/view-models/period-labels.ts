import type { PopularPeriod } from '../../domain/feed-sort';

/**
 * 期間(?period=)の表示ラベル。期間は公開日の「直近 N 日」のローリング窓(PERIOD_DAYS: 1 / 7 / 30 日)で、
 * 暦の「今日・今週・今月」ではない。以前は画面ごとに表記がばらばらで(デスクトップ「今日/今週/今月」・
 * 絞り込みシート「24時間/週間/月間」・チップ「24時間以内/今週以内」)、深夜 1 時に「今日」を選ぶと
 * 前日の記事が並ぶなど、表記と中身が食い違っていた。ここに集約して全画面で同じ表記にする。
 */

/** 切替 UI(並び替えの期間メニュー・絞り込みシート)の短い表記。 */
export const PERIOD_LABEL: Record<PopularPeriod, string> = {
  today: '24時間',
  week: '週間',
  month: '月間',
  all: '全期間',
};

/** 適用中フィルタのチップ表記(「〜以内」で絞り込みであることを示す)。 */
export const PERIOD_WITHIN_LABEL: Record<Exclude<PopularPeriod, 'all'>, string> = {
  today: '24時間以内',
  week: '1週間以内',
  month: '1か月以内',
};

/** 文中(「直近24時間の人気記事はありません」等)の表記。 */
export const PERIOD_RECENT_LABEL: Record<PopularPeriod, string> = {
  today: '直近24時間',
  week: '直近1週間',
  month: '直近1か月',
  all: '全期間',
};

/** 指定した並び順で { value, label } の選択肢を作る(並び順は UI ごとに違うため呼び出し側が決める)。 */
export function periodOptions(
  order: readonly PopularPeriod[],
): { value: PopularPeriod; label: string }[] {
  return order.map((value) => ({ value, label: PERIOD_LABEL[value] }));
}
