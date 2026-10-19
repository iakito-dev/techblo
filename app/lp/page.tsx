import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/json-ld';
import { organizationJsonLd } from '@/lib/seo';
import { resolveBaseUrl } from '@/lib/site-url';
import { LandingBento } from './_components/landing-bento';
import { LandingCompanies } from './_components/landing-companies';
import { LandingCta } from './_components/landing-cta';
import { LandingFeatureRows } from './_components/landing-feature-rows';
import { LandingFooter } from './_components/landing-footer';
import { LandingHero } from './_components/landing-hero';
import { LandingNav } from './_components/landing-nav';
import { LandingTestimonials } from './_components/landing-testimonials';

export const metadata: Metadata = {
  // title は layout の template(`%s｜テクブロ`)に載るためブランド名を含めない(他ページと同じ規約)。
  // トップ `/` と同一文言だと両方 sitemap に載るぶんインデックスが競合するので、
  // LP の中身(機能紹介)に寄せた別の見出しにする。
  title: '機能と使い方',
  // 説明文もトップ `/` と同一だったため、機能の列挙と「登録前に中身がわかる」訴求に振り分ける
  // (トップ側は lib/seo.ts の SITE_DESCRIPTION が持つ)。
  description:
    'AI要約、はてブ人気順、あとで読む、企業の絞り込み、マイフィード。40社以上のテックブログを毎日まとめ読みする流れを、画面つきで紹介します。',
  alternates: { canonical: '/lp' },
};

/**
 * ランディングページ(/lp)。未ログインの訪問者向けの紹介ページ。
 * データ取得は行わない純粋な presentational ページ(features 層を経由しないため
 * ADR-0010 のレイヤー境界に抵触しない)。セクションはすべてサーバーコンポーネント。
 */
export default function LandingPage() {
  return (
    <div className="light min-h-dvh bg-bg-app" data-theme="light">
      <JsonLd data={organizationJsonLd(resolveBaseUrl())} />
      <LandingNav />
      <main>
        <LandingHero />
        <LandingCompanies />
        <LandingBento />
        <LandingFeatureRows />
        <LandingTestimonials />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
