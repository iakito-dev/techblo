import type { ReactNode } from 'react';
import { cn } from '@/shared/utils';

const VARIANT_CLASS = {
  up: 'lp-reveal',
  left: 'lp-reveal-left',
  right: 'lp-reveal-right',
  scale: 'lp-reveal-scale',
} as const;

/**
 * スクロールで一度だけ控えめにアニメーションさせるラッパー(LP の演出用)。
 * 実装は JS 非依存の CSS スクロール駆動アニメーション(`.lp-reveal*` / globals.css)。
 * 未対応ブラウザ・`prefers-reduced-motion`・CSS 失敗時はアニメーションせず常に表示される
 * (コンテンツが隠れないフェイルセーフ。design.md 原則5)。サーバーコンポーネントのまま使える。
 *
 * variant: up=フェードアップ / left,right=横スライド / scale=ズームイン。
 */
export function Reveal({
  children,
  className,
  variant = 'up',
}: {
  children: ReactNode;
  className?: string;
  variant?: keyof typeof VARIANT_CLASS;
}) {
  return <div className={cn(VARIANT_CLASS[variant], className)}>{children}</div>;
}
