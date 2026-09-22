import { ChevronRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

/**
 * モバイル設定 index のドリル行。アイコン + ラベル + 任意の件数 + シェブロンで、
 * 各領域(企業 / マイフィード / サポート)の専用画面へ遷移する。
 * iOS 設定アプリの行に寄せる。デスクトップでは index 自体が lg:hidden で隠れる。
 */
export function SettingsMenuRow({
  href,
  icon: Icon,
  label,
  count,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  count?: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-surface-2 focus-visible:bg-bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Icon className="size-5 shrink-0 text-accent" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-medium text-fg-default text-sm">{label}</span>
      {count !== undefined && <span className="shrink-0 text-fg-subtle text-sm">{count}</span>}
      <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
    </Link>
  );
}
