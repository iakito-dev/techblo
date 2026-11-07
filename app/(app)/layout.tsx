import { Suspense } from 'react';
import { Sidebar } from '@/app/_composition/sidebar';
import { BottomChromeProvider } from '@/components/layout/bottom-chrome';
import { Header } from '@/components/layout/header';
import { KeyboardShortcutsProvider } from '@/components/layout/keyboard-shortcuts';
import { MobileNav } from '@/components/layout/mobile-nav';
import { MobileSwipeNavigation } from '@/components/layout/mobile-swipe-navigation';
import { ScrollToTop } from '@/components/layout/scroll-to-top';
import { SkipLink } from '@/components/layout/skip-link';

/**
 * 主要画面(フィード / ブックマーク / お気に入り / 設定)の共有シェル。
 *
 * Header / Sidebar / MobileNav をこのレイアウトに集約することで、Next.js は子ルート間の
 * 遷移でレイアウトを再マウントしない(=シェルが出っぱなしで保持される)。
 * 以前は各 page.tsx がシェルを描画していたため、遷移のたびにサイドバーが空に戻って
 * 企業一覧を再ストリームし、ヘッダーのアバターも点滅していた。レイアウトへ移すことで
 * - Sidebar(connection() で動的)はグループ初回のみストリームし、以降は保持
 * - Header(useSession のクライアント)は再マウントせず点滅しない
 * - 遷移時は children(コンテンツ領域)だけが loading.tsx / Suspense で差し替わる
 *
 * shell の各要素は fixed / sticky 配置なので、ここで children の外側に並べても
 * 描画位置は従来(各ページの外枠 div 内)と変わらない。コンテンツ側の余白・サイドバー
 * オフセット(lg:pl-64 等)は各ページの外枠 div が引き続き持つ。
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <BottomChromeProvider>
      <KeyboardShortcutsProvider>
        <SkipLink />
        {/*
        Header / MobileNav / MobileSwipeNavigation は現在地を usePathname() で判定する。
        動的セグメントを持つルート(/a/[id])では pathname がビルド時に分からないため、
        cacheComponents 下ではこれらを Suspense 境界に入れないとプリレンダが止まる
        (CLIENT_HOOK_DYNAMIC)。境界に入れておけば、静的ルートは従来どおりプリレンダに
        入り、記事ページだけがシェルを後からストリームする。
        fallback は実物と同じ高さ・位置の枠にして、解決時に本文が動かないようにする。
        Sidebar は自前で Suspense を持つためここでは包まない。
      */}
        <Suspense
          fallback={
            <div className="sticky top-0 z-20 mb-8 h-16 border-border-default border-b bg-bg-surface/80 pt-[env(safe-area-inset-top)] lg:hidden" />
          }
        >
          <Header />
        </Suspense>
        <Sidebar />
        {/* スキップリンクの着地点であり、(app) 配下共通の main ランドマーク。以前はページごとに
            <main> の有無がまちまち(フィード・保存・履歴・設定には無かった)で、スクリーンリーダーの
            「メインへ移動」が効かない画面があったため、ここに一本化する(各 page は <main> を持たない)。 */}
        <main
          data-mobile-swipe-content
          id="main-content"
          tabIndex={-1}
          className="focus:outline-none"
        >
          {children}
        </main>
        <ScrollToTop />
        {/* 表示物を持たない(スワイプの検知のみ)ので fallback は無し。 */}
        <Suspense fallback={null}>
          <MobileSwipeNavigation />
        </Suspense>
        <Suspense
          fallback={
            <div className="fixed inset-x-0 bottom-0 z-30 h-[var(--mobile-nav-h)] border-border-default border-t bg-bg-surface/80 lg:hidden" />
          }
        >
          <MobileNav />
        </Suspense>
      </KeyboardShortcutsProvider>
    </BottomChromeProvider>
  );
}
