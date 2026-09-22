import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * モバイルのサブルート(companies/feeds/support)上部に置く「‹ 設定」戻り導線。
 * iOS の親タイトル戻りに寄せる。画面タイトルは各セクションの見出し(SettingsSection)が担うため、
 * ここは戻り先(設定)のみを示す。デスクトップでは表示しない(親側が lg:hidden で包む)。
 */
export function SettingsBackLink() {
  return (
    <Link
      href="/settings"
      className="mb-4 -ml-1 inline-flex min-h-11 items-center gap-1 rounded-md pr-2 pl-1 font-medium text-accent text-sm transition-colors hover:bg-bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <ChevronLeft className="size-5 shrink-0" aria-hidden="true" />
      設定
    </Link>
  );
}
