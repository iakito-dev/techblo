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
        {/* 説明は 1〜2 行の短文で、既定の折り返しだと「引き継げま / す。」のように語の途中で割れて
          1 文字だけが次行に残るため、文節単位で折る */}
        {description && (
          <p className="text-fg-muted mt-1 text-sm [word-break:auto-phrase]">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}
