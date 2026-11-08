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
        <h2 className="text-fg-default text-base font-semibold">{title}</h2>
        {description && <p className="text-fg-muted mt-1 text-sm">{description}</p>}
      </div>
      {children}
    </section>
  );
}
