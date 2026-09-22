import { cn } from '@/shared/utils';

/**
 * 装飾用のティールのブロブ(ぼかし円)。スクロール連動でゆっくり上下に視差移動する(`.lp-parallax-*`)。
 * 背面レイヤー(`-z-10`)・`pointer-events-none`・transform のみで、コンテンツや操作を妨げない。
 * 親セクションは `relative isolate overflow-hidden` を付けること(ブロブを背面に閉じ込める)。
 */
export function ParallaxBlob({
  className,
  speed = 'up',
  tone = 0.1,
}: {
  className?: string;
  speed?: 'up' | 'down' | 'slow';
  /** ティールの不透明度(0〜1)。淡く保つ。 */
  tone?: number;
}) {
  const parallax =
    speed === 'down'
      ? 'lp-parallax-down'
      : speed === 'slow'
        ? 'lp-parallax-slow'
        : 'lp-parallax-up';
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute -z-10 rounded-full blur-3xl',
        parallax,
        className,
      )}
      style={{
        background: `radial-gradient(closest-side, rgba(15,118,110,${tone}), rgba(15,118,110,${tone * 0.3}) 60%, transparent)`,
      }}
    />
  );
}
