import type { ReactNode } from 'react';

/**
 * 設定ページの1セクション(見出し + 説明 + コンテンツ)。
 * 将来「通知」「表示」等のセクション追加を見越した共通構造。
 * title はクライアント側で動的な件数を含められるよう ReactNode で受ける。
 */
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-base text-fg-default">{title}</h2>
        {description && <p className="mt-1 text-fg-muted text-sm">{description}</p>}
      </div>
      {children}
    </section>
  );
}
