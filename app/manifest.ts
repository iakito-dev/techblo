import type { MetadataRoute } from 'next';
import { SITE_DESCRIPTION } from '@/lib/seo';

/**
 * PWA マニフェスト。ホーム画面追加やインストール時の表示に使う。
 * アイコンは app/icon.svg(scalable)・app/apple-icon(iOS)・/maskable-icon(Android アダプティブ)を参照。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // インストール識別子を start_url から固定し、再インストール/パス変更でも同一アプリ扱いにする。
    id: '/',
    name: 'テクブロ｜テック企業の技術ブログを毎日まとめて読む',
    short_name: 'テクブロ',
    description: SITE_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FAFAF8',
    // viewport.themeColor(app/layout.tsx)と揃える。アプリは offwhite のライトテーマ。
    theme_color: '#FAFAF8',
    lang: 'ja',
    categories: ['news', 'productivity'],
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'any' },
      { src: '/apple-icon', type: 'image/png', sizes: '180x180' },
      // Android アダプティブアイコン用。安全領域(中央 80%)にドットマークを収め、地は全面ティール。
      { src: '/maskable-icon', type: 'image/png', sizes: '512x512', purpose: 'maskable' },
    ],
  };
}
