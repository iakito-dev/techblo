import { ArrowRight, Rss } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FAUX_ARTICLES, FauxArticleCard } from './faux-ui';
import { Magnetic, Tilt } from './motion-fx';

/**
 * ヒーロー。大きなディスプレイ見出し + サブコピー + CTA、その下に
 * プロダクト面(faux フィードグリッド)を浮かせて配置する。背景に淡いティールの glow。
 */
export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* 背景の淡い glow(techblo のティールで Dewey の紫 glow を置換)。 */}
      <div
        aria-hidden="true"
        className="lp-glow pointer-events-none absolute top-[-12rem] left-1/2 -z-10 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, rgba(15,118,110,0.16), rgba(15,118,110,0.04) 60%, transparent)',
        }}
      />
      {/* アウロラ第2グロー(漂い)。位置と色をずらして奥行きを出す。 */}
      <div
        aria-hidden="true"
        className="lp-drift pointer-events-none absolute top-[-8rem] left-1/2 -z-10 h-[28rem] w-[44rem] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            'radial-gradient(closest-side, rgba(15,118,110,0.12), rgba(20,184,166,0.05) 55%, transparent)',
        }}
      />

      <div className="mx-auto w-full max-w-6xl px-6 pt-20 pb-16 text-center sm:pt-24">
        <span className="lp-enter rounded-pill border-border-default bg-bg-surface text-fg-muted inline-flex items-center gap-2 border px-3 py-1 text-xs font-medium shadow-xs">
          <Rss className="text-accent size-3.5" />
          有名テック企業のブログを毎日自動で集約
        </span>

        <h1 className="lp-enter font-editorial text-fg-default mx-auto mt-6 max-w-4xl text-4xl leading-[1.1] font-semibold tracking-tight [word-break:auto-phrase] [--lp-delay:80ms] sm:text-5xl">
          有名テック企業の
          <br className="hidden sm:block" />
          新着ブログ記事をまとめてチェック<span className="text-accent">.</span>
        </h1>

        <p className="lp-enter text-fg-muted mx-auto mt-6 max-w-xl text-base leading-relaxed text-balance [word-break:auto-phrase] [--lp-delay:160ms] sm:text-lg">
          各社のエンジニアブログの新着をまとめて表示。気になる記事は保存してあとでじっくり読めます。
        </p>

        <div className="lp-enter mt-9 flex flex-col items-center justify-center gap-3 [--lp-delay:240ms] sm:flex-row">
          <Magnetic className="w-full sm:w-auto">
            <Button
              asChild
              size="md"
              className="lp-sheen h-11 w-full px-6 text-[0.9375rem] transition-[transform,background,color] hover:-translate-y-0.5 active:translate-y-0 sm:w-auto"
            >
              <Link href="/signup">
                無料で始める
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Magnetic>
          <Magnetic className="w-full sm:w-auto">
            <Button
              asChild
              variant="outline"
              size="md"
              className="h-11 w-full px-6 text-[0.9375rem] transition-[transform,background,color] hover:-translate-y-0.5 active:translate-y-0 sm:w-auto"
            >
              <Link href="/">フィードを見る</Link>
            </Button>
          </Magnetic>
        </div>
        <p className="lp-enter text-fg-faint mt-4 text-xs [--lp-delay:320ms]">
          クレジットカード不要 · Google ですぐログイン
        </p>
      </div>

      {/* プロダクト面: faux フィードグリッド。カーソルで 3D ティルト(motion.dev 風)。 */}
      <div className="lp-enter relative mx-auto w-full max-w-5xl px-6 [--lp-delay:400ms]">
        <Tilt
          max={5}
          className="border-border-default bg-bg-surface-2/60 relative overflow-hidden rounded-t-2xl border border-b-0 p-3 shadow-lg sm:p-5"
        >
          {/* faux ツールバー(並び替えタブ)。 */}
          <div className="mb-3 flex items-center gap-2">
            <span className="bg-primary text-fg-inverse rounded-md px-3 py-1.5 text-xs font-medium">
              新着順
            </span>
            <span className="text-fg-muted rounded-md px-3 py-1.5 text-xs font-medium">人気順</span>
            <span className="text-fg-faint ml-auto hidden text-xs sm:block">新着順に表示中</span>
          </div>
          {/* モバイルも 2 カラム + 末尾2枚を隠して縦を圧縮(下端はフェードで「続き」を示唆)。 */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
            {FAUX_ARTICLES.map((a, i) => (
              <FauxArticleCard
                key={a.title}
                article={a}
                className={i >= 4 ? 'hidden lg:flex' : undefined}
              />
            ))}
          </div>
          {/* 画面はイメージである旨を明示(記事は架空。フッターの免責と併せて誤認を防ぐ)。 */}
          <p className="text-fg-faint absolute right-4 bottom-3 z-10 text-[0.625rem]">
            ※ 画面はイメージです
          </p>
          {/* 下端フェード。 */}
          <div className="from-bg-app pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t to-transparent" />
        </Tilt>
      </div>
    </section>
  );
}
