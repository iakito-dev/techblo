import { ChevronRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * モバイル設定 index のドリル行。アイコン + ラベル + 任意の現在値(件数・テーマ名など)+ シェブロンで、
 * 各領域(企業 / マイフィード / サポート)の専用画面へ遷移する。
 * iOS 設定アプリの行に寄せる。デスクトップでは index 自体が lg:hidden で隠れる。
 */
export function SettingsMenuRow({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="hover:bg-bg-surface-2 focus-visible:bg-bg-surface-2 focus-visible:ring-accent flex min-h-14 items-center gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <Icon className="text-accent size-5 shrink-0" aria-hidden="true" />
      <span className="text-fg-default min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
      {value !== undefined && <span className="text-fg-subtle shrink-0 text-sm">{value}</span>}
      <ChevronRight className="text-fg-subtle size-4 shrink-0" aria-hidden="true" />
    </Link>
  );
}
