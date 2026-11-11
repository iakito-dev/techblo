import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * モバイルのサブルート(companies/feeds/support)上部に置く「‹ 設定」戻り導線。
 * iOS の親タイトル戻りに寄せる。画面タイトルは各セクションの見出し(SettingsSection)が担うため、
 * ここは戻り先(設定)のみを示す。デスクトップでは表示しない(親側が lg:hidden で包む)。
 *
 * モバイルのサブルートは「設定」の h1(デスクトップ用)が非表示で、見出しが h2 だけになる。
 * スクリーンリーダーの見出し移動でページ名に辿り着けるよう、画面名を sr-only の h1 で置く。
 */
export function SettingsBackLink({ title }: { title: string }) {
  return (
    <>
      <h1 className="sr-only">{title}</h1>
      <Link
        href="/settings"
        className="text-accent hover:bg-bg-surface-2 focus-visible:ring-accent mb-4 -ml-1 inline-flex min-h-11 items-center gap-1 rounded-md pr-2 pl-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ChevronLeft className="size-5 shrink-0" aria-hidden="true" />
        設定
      </Link>
    </>
  );
}
