import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Reveal } from './reveal';

/** 最終 CTA。ティールの glow を背に大きく訴求(Dewey の締め CTA に対応)。 */
export function LandingCta() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-20 sm:pb-24">
      <Reveal className="relative overflow-hidden rounded-3xl border border-border-default bg-bg-surface px-6 py-16 text-center shadow-lg sm:py-20">
        <div
          aria-hidden="true"
          className="lp-glow pointer-events-none absolute bottom-[-10rem] left-1/2 h-[24rem] w-[40rem] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(closest-side, rgba(15,118,110,0.22), rgba(15,118,110,0.05) 60%, transparent)',
          }}
        />
        <h2 className="relative mx-auto max-w-2xl font-editorial font-semibold text-3xl text-fg-default leading-[1.12] tracking-tight [word-break:auto-phrase] sm:text-5xl">
          技術ブログの新着を
          <br />
          見逃さない<span className="text-accent">.</span>
        </h2>
        <p className="relative mx-auto mt-5 max-w-md text-balance text-fg-muted leading-relaxed [word-break:auto-phrase]">
          登録は Google アカウントで数秒。無料で今日から始められます。
        </p>
        <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="md" className="h-12 w-full px-7 text-base sm:w-auto">
            <Link href="/signup">
              無料で始める
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="md"
            className="h-12 w-full px-7 text-base sm:w-auto"
          >
            <Link href="/">まずはフィードを見る</Link>
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
