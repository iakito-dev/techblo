import type { ReadFilterMode } from '../../domain/feed-sort';

/** 適用中の未読/既読フィルタを示すチップの表記(モバイルのチップ行・タブレットのツールバー下で共通)。 */
export const READ_FILTER_CHIP_LABEL: Record<Exclude<ReadFilterMode, 'all'>, string> = {
  unread: '未読のみ',
  read: '既読のみ',
};
