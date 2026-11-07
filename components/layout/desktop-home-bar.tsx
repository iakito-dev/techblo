import { Logo } from './logo';

/**
 * デスクトップ(lg+)の公開ページ(/tags・法的ページ)用のホーム導線。
 * これらのページはサイドバーを持たず、モバイル用 Header も lg+ では隠れるため、
 * そのままだと PC ではフィードへ戻る手段がブラウザの戻るだけになる。ロゴ(= `/` へのリンク)を置いて塞ぐ。
 */
export function DesktopHomeBar({ className }: { className?: string }) {
  return (
    <div className={`hidden lg:block ${className ?? ''}`}>
      <Logo />
    </div>
  );
}
