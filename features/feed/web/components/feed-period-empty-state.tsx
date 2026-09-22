'use client';

import { Button } from '@heroui/react';
import { CalendarX } from 'lucide-react';
import type { PopularPeriod } from '../../domain/feed-sort';
import { useFeedPeriod } from '../view-models/use-feed-period';

const PERIOD_LABEL: Record<PopularPeriod, string> = {
  today: '今日',
  week: '今週',
  month: '今月',
  all: '全期間',
};

/**
 * 人気順で集計期間(今日/今週/今月)に該当する記事が無いときの空状態。
 * 「記事がまだ無い(取得を促す)」とは別物で、期間を広げる導線を出す。
 * 全期間へのリセットは useFeedPeriod 経由で URL を更新する(再マウントなし・ADR-0016)。
 */
export function FeedPeriodEmptyState({ period }: { period: PopularPeriod }) {
  const { setPeriod, isPending } = useFeedPeriod();

  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="grid size-16 place-items-center rounded-xl bg-bg-surface-2 text-fg-muted">
        <CalendarX className="size-8" />
      </div>
      <p className="mt-5 font-bold text-fg-default text-lg">
        {PERIOD_LABEL[period]}の人気記事はありません
      </p>
      <p className="mt-2 max-w-xs text-fg-muted text-sm leading-relaxed">
        この期間に公開された記事が見つかりませんでした。集計期間を広げてみてください。
      </p>
      <Button size="lg" isDisabled={isPending} onPress={() => setPeriod('all')} className="mt-6">
        全期間で見る
      </Button>
    </div>
  );
}
