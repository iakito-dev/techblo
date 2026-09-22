'use client';

/**
 * グローバル error boundary。
 * Next.js 16 のデフォルト global-error は cacheComponents 環境で prerender に失敗するため、
 * 自前で定義する。将来 Sentry へのエラー送信を追加(M6)。
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>エラーが発生しました</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>時間をおいて再度お試しください。</p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            background: 'var(--color-ink)',
            color: 'var(--color-surface)',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          再試行
        </button>
      </body>
    </html>
  );
}
