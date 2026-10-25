import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata, Viewport } from 'next';
import { Inter, Newsreader, Noto_Sans_JP, Outfit } from 'next/font/google';
import { GuestSavesMigrator } from '@/components/article/guest-saves-migrator';
import { ThemedToaster } from '@/components/layout/themed-toaster';
import { env } from '@/lib/env';
import { SITE_DESCRIPTION, SITE_SOCIAL_DESCRIPTION } from '@/lib/seo';
import { resolveBaseUrl } from '@/lib/site-url';
import { Providers } from './providers';
import './globals.css';

/**
 * フォント: Latin は Inter、日本語は Noto Sans JP(Base44 デザインに合わせる)。
 * CSS 変数として公開し、globals.css の --font-sans が参照する。
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

/** ロゴ(ワードマーク)用フォント。globals.css の font-editorial が参照する。 */
const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

/** はてブ数等の数値表示用セリフ。globals.css の font-metric が参照する(和文には使わない)。 */
const newsreader = Newsreader({
  weight: ['500', '600'],
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
});

const notoSansJp = Noto_Sans_JP({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: 'テクブロ｜企業テックブログまとめ。40社以上の新着を毎日更新',
    template: '%s｜テクブロ',
  },
  applicationName: 'テクブロ',
  // 検索結果(SERP)向けの説明文。JSON-LD と同じ真実源(lib/seo.ts)を使う。
  description: SITE_DESCRIPTION,
  metadataBase: new URL(resolveBaseUrl()),
  // RSS リーダーの自動検出用(ADR-0039)。alternates はページ側で上書きされる(浅いマージ)ため、
  // canonical を持つページでは出ない。
  alternates: {
    types: { 'application/rss+xml': [{ url: '/feed.xml', title: 'テクブロ 新着' }] },
  },
  // アイコン(icon.svg / apple-icon)・manifest・opengraph-image は app/ のファイル規約で自動付与される。
  appleWebApp: {
    capable: true,
    title: 'テクブロ',
    statusBarStyle: 'default',
  },
  // OGP/Twitter は SNS カード向けに、SERP 用とは別の訴求寄りタイトル・説明文を持たせる。
  // 区切りは title.template と同じ全角｜に揃える。
  openGraph: {
    title: 'テクブロ｜企業テックブログを、AI要約つきでまとめ読み',
    description: SITE_SOCIAL_DESCRIPTION,
    siteName: 'テクブロ',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'テクブロ｜企業テックブログを、AI要約つきでまとめ読み',
    description: SITE_SOCIAL_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  // Google Search Console の所有権確認(HTMLメタタグ方式)。トークンは Vercel の環境変数
  // GOOGLE_SITE_VERIFICATION に入れる(コードに直書きしない)。未設定ならタグは出ない。
  // DNS TXT 方式で確認する場合はこの環境変数は不要。
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAFAF8' },
    { media: '(prefers-color-scheme: dark)', color: '#16181D' },
  ],
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${inter.variable} ${notoSansJp.variable} ${outfit.variable} ${newsreader.variable}`}
    >
      <body className="min-h-dvh bg-bg-app text-fg-default antialiased">
        {/* 画面最上部のローディングバー・PostHog 等のクライアント provider(app/providers.tsx) */}
        <Providers
          posthog={{ key: env.NEXT_PUBLIC_POSTHOG_KEY, host: env.NEXT_PUBLIC_POSTHOG_HOST }}
        >
          {children}
          <ThemedToaster />
        </Providers>
        <GuestSavesMigrator />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
