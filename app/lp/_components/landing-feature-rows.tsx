import { Bookmark, Check, Flame, Heart, Plus, Rss, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/utils';
import { ParallaxBlob } from './decor';
import { CompanyGlyph, FAUX_ARTICLES, FAUX_FEEDS } from './faux-ui';
import { Reveal } from './reveal';
import { Slider } from './slider';

type Feature = {
  eyebrow: string;
  title: string;
  body: string;
  visual: ReactNode;
};

const FEATURES: Feature[] = [
  {
    eyebrow: '並び替え',
    title: '話題の記事を見逃さない',
    body: '新着順でも人気順でも自由。話題の記事もひと目でわかります。',
    visual: <PopularVisual />,
  },
  {
    eyebrow: 'AI要約',
    title: '読む前に要点をつかむ',
    body: 'AI が要点と関連タグを自動生成。記事を開く前に読むべきか判断できます。',
    visual: <SummaryVisual />,
  },
  {
    eyebrow: '保存',
    title: 'あとで読む記事をすべての端末で',
    body: '気になった記事はワンタップで保存。全端末で同期され続きから読めます。',
    visual: <SavedVisual />,
  },
  {
    eyebrow: '表示する企業を選ぶ',
    title: '見たい企業だけに絞り込む',
    body: '表示する企業を選べばその記事だけが新着に並びます。ノイズのない一覧に。',
    visual: <SubscriptionVisual />,
  },
  {
    eyebrow: 'マイフィード（ログイン特典）',
    title: '一覧に無いブログも自分で追加',
    body: '一覧に無いブログの RSS も登録してメインの新着に合流できます。',
    visual: <MyFeedVisual />,
  },
];

/**
 * 機能紹介。
 * - デスクトップ(lg+): 交互レイアウトの大型行(Dewey の図版付きセクション)。
 * - モバイル/タブレット(<lg): 縦積みは長くなるため、横スワイプのスライダー(CSS scroll-snap)に切替。
 */
export function LandingFeatureRows() {
  return (
    <section className="relative isolate overflow-hidden bg-bg-surface/40 py-8">
      {/* スクロール連動で漂う装飾ブロブ(背面)。スクロールするだけで視覚的に動く。 */}
      <ParallaxBlob speed="up" className="top-24 -left-24 size-72" tone={0.1} />
      <ParallaxBlob speed="down" className="-right-20 bottom-24 size-80" tone={0.08} />

      {/* デスクトップ: 交互の大型行 */}
      <div className="mx-auto hidden w-full max-w-6xl flex-col gap-24 px-6 py-16 lg:flex">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} variant={i % 2 === 1 ? 'right' : 'left'}>
            <FeatureRow {...f} reverse={i % 2 === 1} />
          </Reveal>
        ))}
      </div>

      {/* モバイル/タブレット: ドラッグ + 慣性 + スナップのカルーセル(縦長を圧縮) */}
      <div className="py-12 lg:hidden">
        <Slider
          ariaLabel="機能"
          align="start"
          slideClassName="w-[86%] sm:w-[58%]"
          items={FEATURES.map((f) => ({
            key: f.title,
            content: (
              <div className="flex flex-col gap-4">
                {/* テキスト枠に最小高さを与え、全スライドで図版の上端を揃える(行数差のズレ防止)。 */}
                <div className="min-h-[8rem] px-1 sm:min-h-[6rem]">
                  <p className="font-medium text-accent text-sm">{f.eyebrow}</p>
                  <h2 className="mt-1.5 font-editorial font-semibold text-fg-default text-xl leading-tight tracking-tight [word-break:auto-phrase]">
                    {f.title}
                  </h2>
                  <p className="mt-2 text-fg-muted text-sm leading-relaxed [word-break:auto-phrase]">
                    {f.body}
                  </p>
                </div>
                {f.visual}
              </div>
            ),
          }))}
        />
      </div>
    </section>
  );
}

function FeatureRow({
  eyebrow,
  title,
  body,
  visual,
  reverse,
}: {
  eyebrow: string;
  title: string;
  body: string;
  visual: ReactNode;
  reverse?: boolean;
}) {
  // grid-cols-1 を明示(Tailwind は minmax(0,1fr) になり、子が縮んで横はみ出しを防ぐ)。
  return (
    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={cn('min-w-0', reverse && 'lg:order-2')}>
        <p className="font-medium text-accent text-sm">{eyebrow}</p>
        <h2 className="mt-3 font-editorial font-semibold text-2xl text-fg-default leading-tight tracking-tight [word-break:auto-phrase] sm:text-3xl">
          {title}
        </h2>
        <p className="mt-4 max-w-md text-balance text-fg-muted leading-relaxed [word-break:auto-phrase]">
          {body}
        </p>
      </div>
      <div className={cn('relative min-w-0', reverse && 'lg:order-1')}>{visual}</div>
    </div>
  );
}

/** 図版を載せる共通の台座(ソフトな影 + 角丸 + 淡い背景)。 */
function VisualFrame({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border-default bg-bg-surface p-5 shadow-lg">
      {children}
    </div>
  );
}

/** 人気順の faux ランキングリスト。 */
function PopularVisual() {
  const ranked = [...FAUX_ARTICLES].sort((a, b) => b.hatena - a.hatena).slice(0, 4);
  return (
    <VisualFrame>
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-md px-2.5 py-1 font-medium text-fg-muted text-xs">新着順</span>
        <span className="rounded-md bg-primary px-2.5 py-1 font-medium text-fg-inverse text-xs">
          人気順
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {ranked.map((a, i) => (
          <li
            key={a.title}
            className="flex items-center gap-3 rounded-lg border border-border-default px-3 py-2.5"
          >
            <span className="w-4 shrink-0 text-center font-bold text-fg-faint text-sm tabular-nums">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-fg-default text-sm">{a.title}</p>
              <span className="flex items-center gap-1.5 text-[0.6875rem] text-fg-faint">
                <CompanyGlyph label={a.glyph} />
                {a.company}
              </span>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-fg-secondary text-xs tabular-nums">
              <Flame fill="currentColor" className="size-3.5 text-[#ea580c]" />
              {a.hatena}
            </span>
          </li>
        ))}
      </ul>
    </VisualFrame>
  );
}

/** ブックマーク/お気に入りの faux リスト。 */
function SavedVisual() {
  const saved = FAUX_ARTICLES.slice(0, 3);
  return (
    <VisualFrame>
      <div className="mb-3 flex items-center gap-2 font-semibold text-fg-default text-sm">
        <Bookmark className="size-4 text-accent" />
        ブックマーク
      </div>
      <ul className="flex flex-col gap-2">
        {saved.map((a, i) => (
          <li
            key={a.title}
            className="flex items-center gap-3 rounded-lg border border-border-default px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-fg-default text-sm">{a.title}</p>
              <span className="flex items-center gap-1.5 text-[0.6875rem] text-fg-faint">
                <CompanyGlyph label={a.glyph} />
                {a.company}
              </span>
            </div>
            {i === 0 ? (
              <Heart fill="currentColor" className="size-4 shrink-0 text-accent" />
            ) : (
              <Bookmark fill="currentColor" className="size-4 shrink-0 text-fg-faint" />
            )}
          </li>
        ))}
      </ul>
    </VisualFrame>
  );
}

/** 購読フィルタの faux トグルリスト。 */
function SubscriptionVisual() {
  const subs = FAUX_FEEDS;
  return (
    <VisualFrame>
      <p className="mb-3 font-semibold text-fg-default text-sm">表示する企業</p>
      <ul className="flex flex-col gap-2">
        {subs.map((c, i) => {
          const on = i % 3 !== 2;
          return (
            <li
              key={c.name}
              className="flex items-center gap-3 rounded-lg border border-border-default px-3 py-2.5"
            >
              <CompanyGlyph label={c.glyph} />
              <span className="flex-1 font-medium text-fg-default text-sm">{c.name}</span>
              <span
                className={cn(
                  'flex h-5 w-9 items-center rounded-pill px-0.5 transition-colors',
                  on ? 'justify-end bg-accent' : 'justify-start bg-bg-surface-3',
                )}
              >
                <span className="grid size-4 place-items-center rounded-full bg-bg-surface text-accent">
                  {on && <Check className="size-3" />}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </VisualFrame>
  );
}

/** マイフィード(ユーザー登録 RSS)の faux パネル。URL 入力 + 登録済みリスト。 */
function MyFeedVisual() {
  const feeds = [
    { name: 'ある個人開発者のブログ', glyph: 'B' },
    { name: 'チームの社内テックブログ', glyph: 'T' },
    { name: '海外エンジニアの Newsletter', glyph: 'N' },
  ];
  return (
    <VisualFrame>
      <p className="mb-3 font-semibold text-fg-default text-sm">マイフィード</p>
      {/* URL 入力 + 登録ボタン(faux)。 */}
      <div className="mb-3 flex items-center gap-2">
        <span className="flex flex-1 items-center gap-2 rounded-lg border border-border-default px-3 py-2 text-fg-faint text-xs">
          <Rss className="size-3.5 text-accent" />
          https://example.com/feed
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 font-medium text-fg-inverse text-xs">
          <Plus className="size-3.5" />
          登録
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {feeds.map((f) => (
          <li
            key={f.name}
            className="flex items-center gap-3 rounded-lg border border-border-default px-3 py-2.5"
          >
            <CompanyGlyph label={f.glyph} />
            <span className="min-w-0 flex-1 truncate font-medium text-fg-default text-sm">
              {f.name}
            </span>
            <span className="flex h-5 w-9 items-center justify-end rounded-pill bg-accent px-0.5">
              <span className="grid size-4 place-items-center rounded-full bg-bg-surface text-accent">
                <Check className="size-3" />
              </span>
            </span>
          </li>
        ))}
      </ul>
    </VisualFrame>
  );
}

/**
 * AI要約の faux コールアウト。アプリ内 SummaryView と同じ表現
 * (ティール地・Sparkles ラベル・要点チェック・タグピル・正確性の断り書き)を再現する。
 * AI 生成である旨と免責を必ず併記する(design.md 原則6・ADR-0026・法務配慮)。
 */
function SummaryVisual() {
  const bullets = [
    'Kafka のパーティション再設計でスループットを維持',
    '不要なレプリカ削減と保持期間見直しで月額を約3割削減',
    '移行はローリングで無停止、ダッシュボードで監視',
  ];
  const tags = ['Kafka', 'インフラ', 'コスト最適化'];
  return (
    <VisualFrame>
      <div className="rounded-md bg-accent-soft px-4 py-3">
        <div className="mb-2 flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-accent" aria-hidden />
          <span className="font-bold text-accent text-xs tracking-wide">AI要約</span>
        </div>
        <ul className="flex flex-col gap-1.5">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2 text-fg-default text-sm leading-snug">
              <Check className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-bg-surface px-2 py-0.5 font-medium text-accent text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="mt-2.5 text-accent/80 text-xs">
          元記事の内容を AI が要約したものです。正確性は保証されません。
        </p>
      </div>
    </VisualFrame>
  );
}
