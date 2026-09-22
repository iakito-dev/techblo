import type { LucideIcon } from 'lucide-react';
import { Activity, Compass, MonitorSmartphone, Quote, Server } from 'lucide-react';
import { Reveal } from './reveal';
import { Slider } from './slider';

type Voice = {
  quote: string;
  name: string;
  role: string;
  icon: LucideIcon;
};

/** 利用シーンの声(イメージ。実在の人物・発言ではありません)。 */
const VOICES: Voice[] = [
  {
    quote: '巡回していた 7 つのブックマークが消えました。朝の情報収集が 5 分で終わります。',
    name: 'バックエンドエンジニア',
    role: 'SaaS スタートアップ',
    icon: Server,
  },
  {
    quote: '人気順で話題の記事だけ拾えるのが良い。チームの輪読会のネタ探しに使ってます。',
    name: 'テックリード',
    role: '受託開発',
    icon: Compass,
  },
  {
    quote: '通勤中にスマホでブックマーク、家の PC で続きを読む。同期が地味に効きます。',
    name: 'フロントエンドエンジニア',
    role: '事業会社',
    icon: MonitorSmartphone,
  },
  {
    quote: '表示する企業を絞れるので、興味のある記事だけが流れてくる。ノイズがないのが快適。',
    name: 'SRE',
    role: 'メガベンチャー',
    icon: Activity,
  },
];

/**
 * 利用者の声(Dewey の testimonials グリッドに対応)。
 * 内容はイメージである旨を明示し、誤認を避ける。
 * アバターは実在の人物に紐づかないよう、役割を表すアイコン(中立)で表現する。
 */
export function LandingTestimonials() {
  return (
    <section id="voices" className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance font-editorial font-semibold text-3xl text-fg-default leading-tight tracking-tight [word-break:auto-phrase] sm:text-4xl">
          エンジニアの“読む”を軽くする
        </h2>
        <p className="mt-4 text-fg-muted leading-relaxed">こんな使われ方を想定しています。</p>
      </Reveal>

      {/* デスクトップ(lg+): グリッド。 */}
      <div className="mt-12 hidden gap-4 lg:grid lg:grid-cols-4">
        {VOICES.map((v) => (
          <VoiceCard key={v.quote} voice={v} />
        ))}
      </div>

      {/* モバイル/タブレット(<lg): ドラッグ + 慣性 + スナップのカルーセル(縦積みを圧縮)。 */}
      <div className="mt-10 lg:hidden">
        <Slider
          ariaLabel="利用者の声"
          slideClassName="w-[78%] sm:w-[44%]"
          items={VOICES.map((v) => ({ key: v.quote, content: <VoiceCard voice={v} /> }))}
        />
      </div>

      <p className="mt-6 text-center text-fg-faint text-xs">※ 掲載内容は利用イメージです。</p>
    </section>
  );
}

function VoiceCard({ voice }: { voice: Voice }) {
  const Icon = voice.icon;
  return (
    <figure className="flex h-full flex-col gap-4 rounded-xl border border-border-default bg-bg-surface p-5 shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-card-hover">
      <Quote aria-hidden className="size-5 text-accent/40" fill="currentColor" />
      <blockquote className="flex-1 text-fg-default text-sm leading-relaxed">
        {voice.quote}
      </blockquote>
      <figcaption className="flex items-center gap-3 border-border-default/70 border-t pt-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
          <Icon className="size-4.5" />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate font-semibold text-fg-default text-sm">{voice.name}</span>
          <span className="truncate text-fg-faint text-xs">{voice.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}
