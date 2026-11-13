'use client';

import { Button } from '@heroui/react';
import { CalendarX } from 'lucide-react';
import type { PopularPeriod } from '../../domain/feed-sort';
import { PERIOD_RECENT_LABEL } from '../view-models/period-labels';
import { useFeedPeriod } from '../view-models/use-feed-period';

/**
 * 人気順で集計期間(直近24時間/1週間/1か月)に該当する記事が無いときの空状態。
 * 「記事がまだ無い(取得を促す)」とは別物で、期間を広げる導線を出す。
 * 全期間へのリセットは useFeedPeriod 経由で URL を更新する(再マウントなし・ADR-0016)。
 */
export function FeedPeriodEmptyState({ period }: { period: PopularPeriod }) {
  const { setPeriod, isPending } = useFeedPeriod();

  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="bg-bg-surface-2 text-fg-muted grid size-16 place-items-center rounded-xl">
        <CalendarX className="size-8" />
      </div>
      <p className="text-fg-default mt-5 text-lg font-bold">
        {PERIOD_RECENT_LABEL[period]}の人気記事はありません
      </p>
      <p className="text-fg-muted mt-2 max-w-xs text-sm leading-relaxed">
        この期間に公開された記事が見つかりませんでした。集計期間を広げてみてください。
      </p>
      <Button size="lg" isDisabled={isPending} onPress={() => setPeriod('all')} className="mt-6">
        全期間で見る
      </Button>
    </div>
  );
}
