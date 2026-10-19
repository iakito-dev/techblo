const JST = 'Asia/Tokyo';
const DAY_MS = 86_400_000;
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

// en-CA は YYYY-MM-DD を返すので、JST の暦日をそのまま取り出せる
const dayKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: JST,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function jstDay(date: Date): { key: string; year: number; month: number; day: number } {
  const key = dayKeyFormat.format(date);
  const [year, month, day] = key.split('-').map(Number) as [number, number, number];
  return { key, year, month, day };
}

/** JST の暦日で now から何日前か(今日=0)。時刻差ではなく日付境界で数える。 */
function daysAgo(target: ReturnType<typeof jstDay>, today: ReturnType<typeof jstDay>): number {
  return Math.round(
    (Date.UTC(today.year, today.month - 1, today.day) -
      Date.UTC(target.year, target.month - 1, target.day)) /
      DAY_MS,
  );
}

function dayLabel(target: ReturnType<typeof jstDay>, today: ReturnType<typeof jstDay>): string {
  const diff = daysAgo(target, today);
  if (diff === 0) return '今日';
  if (diff === 1) return '昨日';
  const weekday =
    WEEKDAYS[new Date(Date.UTC(target.year, target.month - 1, target.day)).getUTCDay()];
  const md = `${target.month}月${target.day}日(${weekday})`;
  return target.year === today.year ? md : `${target.year}年${md}`;
}

export type ReadHistoryGroup<T> = { key: string; label: string; items: T[] };

/**
 * 閲覧履歴を JST の日付ごとにまとめる(今日 / 昨日 / M月D日(曜))。
 * 入力順(= 読んだ新しい順)を保ち、同じ日付は連続している前提で隣接する同日をまとめる。
 * 表示はサーバー・ブラウザのタイムゾーンに依らず JST で揃える(shared/date.ts と同じ方針)。
 */
export function groupReadHistory<T>(
  items: readonly T[],
  readAtOf: (item: T) => Date,
  now: Date,
): ReadHistoryGroup<T>[] {
  const today = jstDay(now);
  const groups: ReadHistoryGroup<T>[] = [];
  for (const item of items) {
    const day = jstDay(readAtOf(item));
    const last = groups.at(-1);
    if (last && last.key === day.key) {
      last.items.push(item);
    } else {
      groups.push({ key: day.key, label: dayLabel(day, today), items: [item] });
    }
  }
  return groups;
}
