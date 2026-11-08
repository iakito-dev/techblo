import type { LucideIcon } from 'lucide-react';
import { Flame, Gauge, Layers, RefreshCw } from 'lucide-react';
import { cn } from '@/shared/utils';
import { ParallaxBlob } from './decor';
import { Reveal } from './reveal';

type BentoItem = {
  icon: LucideIcon;
  title: string;
  body: string;
  span?: boolean;
};

const ITEMS: BentoItem[] = [
  {
    icon: Layers,
    title: '一箇所に集約',
    body: '各社のブログを開いて回る必要はありません。新着がひとつの画面にまとまります。',
    span: true,
  },
  {
    icon: RefreshCw,
    title: '毎日自動更新',
    body: 'RSS を定期取得。見ていない間も、最新記事が自動で集まります。',
  },
  {
    icon: Gauge,
    title: 'とにかく速い',
    body: 'テキスト主体の軽量カードで、新着をすばやく見渡せます。',
  },
  {
    icon: Flame,
    title: '話題がひと目で',
    body: 'はてなブックマーク数で人気記事を可視化。話題の記事を見逃しません。',
    span: true,
  },
];

/**
 * 機能セクションの導入。見出し + 2×2 のベントーグリッド(Dewey の
 * "Order for the chaos" + 機能カード群に対応)。
 */
export function LandingBento() {
  return (
    <section
      id="features"
      className="relative isolate mx-auto w-full max-w-6xl overflow-hidden px-6 py-16 sm:py-24"
    >
      {/* スクロール連動で漂う装飾ブロブ(背面)。 */}
      <ParallaxBlob speed="down" className="top-10 -right-16 size-72" tone={0.09} />
      <ParallaxBlob speed="up" className="bottom-10 -left-16 size-72" tone={0.07} />

      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="text-accent text-sm font-medium">巡回の手間をゼロに</p>
        <h2 className="font-editorial text-fg-default mt-3 text-3xl leading-tight font-semibold tracking-tight text-balance [word-break:auto-phrase] sm:text-4xl">
          散らばった新着をひとつの画面に
        </h2>
        <p className="text-fg-muted mt-4 leading-relaxed text-balance [word-break:auto-phrase]">
          タブを埋め尽くすブックマークも何個ものブログ巡回ももう不要。テクブロが新着チェックを一本化します。
        </p>
      </Reveal>

      {/* モバイルも 2 カラムにして縦の長さを抑える(span カードは全幅)。 */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:mt-14 sm:grid-cols-3 sm:gap-4">
        {ITEMS.map((item) => (
          <Reveal
            key={item.title}
            variant="scale"
            className={cn(
              'border-border-default bg-bg-surface shadow-card hover:shadow-card-hover flex flex-col gap-3 rounded-xl border p-5 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 sm:p-6',
              item.span && 'col-span-2',
            )}
          >
            <span className="bg-primary-soft text-accent grid size-9 place-items-center rounded-md sm:size-10">
              <item.icon className="size-4.5 sm:size-5" />
            </span>
            <h3 className="text-fg-default text-base font-bold tracking-tight sm:text-lg">
              {item.title}
            </h3>
            <p className="text-fg-muted text-sm leading-relaxed">{item.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
