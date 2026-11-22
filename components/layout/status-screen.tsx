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
      <Icon className="text-fg-subtle size-10" />
      {/* 中央寄せの短い文は既定の折り返しだと「あり / ます」のように語の途中で割れ、1〜2 文字だけが
        次行に残る。文節単位で折り(auto-phrase)、行の長さをそろえる(balance)。 */}
      <h1 className="text-fg-default mt-4 text-lg font-bold text-balance [word-break:auto-phrase]">
        {title}
      </h1>
      <p className="text-fg-muted mt-1 max-w-sm text-sm text-balance [word-break:auto-phrase]">
        {description}
      </p>
      {children && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{children}</div>
      )}
    </div>
  );
}
