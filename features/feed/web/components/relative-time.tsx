'use client';

import { formatDateTime, formatRelative } from '@/shared/date';

/**
 * 公開日時の相対表記(例: 3時間前)。
 *
 * 記事カード(ArticleCard)は動的レンダリング経路でのみ使う(トップは動的な SubscribedFeed、
 * ブックマーク/お気に入りはユーザー固有で動的。静的プリレンダのフォールバックは FeedGridSkeleton で
 * カードを含まない。ADR-0024)。よって相対表記をサーバーHTMLに直接焼ける(cacheComponents の
 * 静的プリレンダ中に `new Date()` を読めない制約は、この経路では発生しない)。
 * 以前は静的プリレンダ制約を避けるため「初期=絶対日付 → マウント後=相対表記」に差し替えていたが、
 * リロード直後に「日付 → 3時間前」のちらつきになっていたため初期から相対表記に統一した(ADR-0024)。
 * now() のサーバー/クライアント差は粒度が粗くほぼ同一文字列になるが、境界差分は
 * suppressHydrationWarning で抑える(差し替えはせずサーバー値を維持 = ちらつかない)。
 */
export function RelativeTime({ date, className }: { date: Date; className?: string }) {
  // hover で正確な日時を確認できるようにする
  return (
    <span
      title={formatDateTime(date)}
      className={`inline-block min-w-12 ${className ?? ''}`}
      suppressHydrationWarning
    >
      {formatRelative(date)}
    </span>
  );
}
