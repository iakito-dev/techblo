import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * 404 / エラーなど「本来の中身を出せない画面」の共通レイアウト。
 * not-found.tsx と error.tsx がレイアウト違いにならないよう、見た目はここに集約する。
 * 余白は各ページ(コンテンツ領域)側が持ち、ここは中央寄せの箱だけを担う。
 */
export function StatusScreen({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <Icon className="size-10 text-fg-subtle" />
      <h1 className="mt-4 font-bold text-fg-default text-lg">{title}</h1>
      <p className="mt-1 max-w-sm text-fg-muted text-sm">{description}</p>
      {children && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{children}</div>
      )}
    </div>
  );
}
