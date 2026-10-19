import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,

  // React Compiler(babel-plugin-react-compiler 1.0)。全コンポーネントを自動メモ化し、
  // 手動 memo/useCallback/useMemo 頼みを減らしてクライアント再描画を軽くする。
  // 規則違反のコンポーネントはコンパイラがスキップ(bail out)するので安全側に倒れる。
  // Next.js 16 で experimental.reactCompiler はトップレベル reactCompiler に昇格。
  reactCompiler: true,

  // PPR を有効化(Next.js 16 で experimental.ppr は cacheComponents に統合 → さらにトップレベルへ昇格)
  cacheComponents: true,

  // クライアントルーターキャッシュ
  // NOTE: experimental.viewTransition は Next.js 16.3 で config から削除された。
  // アプリ側で <ViewTransition> も view-transition-name も使っていないため、キーごと落とす
  // (16.3 以降は未知キーとして警告 + 型エラーになりビルドが落ちる)。
  experimental: {
    // クライアントルーターキャッシュの保持時間(秒)。既定では dynamic ページのキャッシュが
    // 実質 0 で、一度訪れたページへ戻るたびに再ストリームしていた。dynamic を 30s 保持して
    // フィード⇔ブックマーク/お気に入り/設定の往復を即時表示にする(再訪時の Neon 往復も省く)。
    // 鮮度は保存/購読トグルの Server Action による revalidateTag が即時無効化するので、
    // 30s のクライアント保持で古いデータが残る心配はない。static はリンク prefetch を効かせる。
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    // 記事ページへのリンクに付ける unstable_dynamicOnHover を有効化する(ADR-0042)。
    // 既定の prefetch(auto)は動的ルート /a/[id] の枠(skeleton)までしか先読みしないので、
    // hover / touchstart の時点で本文まで含めた full prefetch に切り替え、タップ後に本文が即出るようにする。
    // 画面内の全カードを full prefetch(prefetch={true})すると、スクロールするだけで
    // カードの数だけサーバー呼び出しが走るため、操作の意図が見えた1件だけに絞る。
    dynamicOnHover: true,
  },

  // OGP画像のホットリンク許可ドメイン(対象6社)
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86_400,
    remotePatterns: [
      { protocol: 'https', hostname: 'techblog.lycorp.co.jp' },
      { protocol: 'https', hostname: 'engineering.mercari.com' },
      { protocol: 'https', hostname: 'tech.layerx.co.jp' },
      { protocol: 'https', hostname: 'engineering.dena.com' },
      { protocol: 'https', hostname: 'blog.serverworks.co.jp' },
      { protocol: 'https', hostname: 'dev.classmethod.jp' },
      // 各社のCDN画像URLも追加されたら追記
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: 'cdn-ak.f.st-hatena.com' },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // HTTPS を 2 年間強制し、サブドメイン・HSTS preload も含める。
          // Vercel は HSTS を自動付与しないため明示する(常時 HTTPS の本サービス前提)。
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // Sentry 等の instrumentation hook を有効化
  // (Next.js 15+ で自動有効、明示は不要だが念のため)
};

export default config;
