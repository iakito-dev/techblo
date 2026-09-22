/**
 * サイトの絶対 URL を解決する(OGP/canonical/robots/sitemap で共有)。
 *
 * 明示設定 NEXT_PUBLIC_APP_URL を最優先し、未設定なら Vercel 提供のドメインに
 * フォールバックする(本番は安定ドメイン VERCEL_PROJECT_PRODUCTION_URL、プレビューは
 * デプロイ毎の VERCEL_URL)。これにより環境変数の手動設定なしでも og:image が
 * 絶対 URL になり、SNS クローラーから取得できる。
 *
 * 末尾スラッシュは付けない(`new URL(path, base)` での結合や robots/sitemap での
 * 文字列連結で二重スラッシュにならないようにするため)。
 */
export function resolveBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000');
  return raw.replace(/\/+$/, '');
}

/**
 * 本番デプロイか(production ドメイン)。プレビュー/開発では false。
 * robots.txt をプレビューで全拒否にしてインデックス汚染を防ぐ判定に使う。
 */
export function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
}
