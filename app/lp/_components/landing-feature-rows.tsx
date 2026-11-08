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
    <section className="bg-bg-surface/40 relative isolate overflow-hidden py-8">
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
                  <p className="text-accent text-sm font-medium">{f.eyebrow}</p>
                  <h2 className="font-editorial text-fg-default mt-1.5 text-xl leading-tight font-semibold tracking-tight [word-break:auto-phrase]">
                    {f.title}
                  </h2>
                  <p className="text-fg-muted mt-2 text-sm leading-relaxed [word-break:auto-phrase]">
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
        <p className="text-accent text-sm font-medium">{eyebrow}</p>
        <h2 className="font-editorial text-fg-default mt-3 text-2xl leading-tight font-semibold tracking-tight [word-break:auto-phrase] sm:text-3xl">
          {title}
        </h2>
        <p className="text-fg-muted mt-4 max-w-md leading-relaxed text-balance [word-break:auto-phrase]">
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
    <div className="border-border-default bg-bg-surface rounded-2xl border p-5 shadow-lg">
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
        <span className="text-fg-muted rounded-md px-2.5 py-1 text-xs font-medium">新着順</span>
        <span className="bg-primary text-fg-inverse rounded-md px-2.5 py-1 text-xs font-medium">
          人気順
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {ranked.map((a, i) => (
          <li
            key={a.title}
            className="border-border-default flex items-center gap-3 rounded-lg border px-3 py-2.5"
          >
            <span className="text-fg-faint w-4 shrink-0 text-center text-sm font-bold tabular-nums">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-fg-default truncate text-sm font-semibold">{a.title}</p>
              <span className="text-fg-faint flex items-center gap-1.5 text-[0.6875rem]">
                <CompanyGlyph label={a.glyph} />
                {a.company}
              </span>
            </div>
            <span className="text-fg-secondary inline-flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums">
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
      <div className="text-fg-default mb-3 flex items-center gap-2 text-sm font-semibold">
        <Bookmark className="text-accent size-4" />
        ブックマーク
      </div>
      <ul className="flex flex-col gap-2">
        {saved.map((a, i) => (
          <li
            key={a.title}
            className="border-border-default flex items-center gap-3 rounded-lg border px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-fg-default truncate text-sm font-semibold">{a.title}</p>
              <span className="text-fg-faint flex items-center gap-1.5 text-[0.6875rem]">
                <CompanyGlyph label={a.glyph} />
                {a.company}
              </span>
            </div>
            {i === 0 ? (
              <Heart fill="currentColor" className="text-accent size-4 shrink-0" />
            ) : (
              <Bookmark fill="currentColor" className="text-fg-faint size-4 shrink-0" />
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
      <p className="text-fg-default mb-3 text-sm font-semibold">表示する企業</p>
      <ul className="flex flex-col gap-2">
        {subs.map((c, i) => {
          const on = i % 3 !== 2;
          return (
            <li
              key={c.name}
              className="border-border-default flex items-center gap-3 rounded-lg border px-3 py-2.5"
            >
              <CompanyGlyph label={c.glyph} />
              <span className="text-fg-default flex-1 text-sm font-medium">{c.name}</span>
              <span
                className={cn(
                  'rounded-pill flex h-5 w-9 items-center px-0.5 transition-colors',
                  on ? 'bg-accent justify-end' : 'bg-bg-surface-3 justify-start',
                )}
              >
                <span className="bg-bg-surface text-accent grid size-4 place-items-center rounded-full">
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
      <p className="text-fg-default mb-3 text-sm font-semibold">マイフィード</p>
      {/* URL 入力 + 登録ボタン(faux)。 */}
      <div className="mb-3 flex items-center gap-2">
        <span className="border-border-default text-fg-faint flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-xs">
          <Rss className="text-accent size-3.5" />
          https://example.com/feed
        </span>
        <span className="bg-primary text-fg-inverse inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-medium">
          <Plus className="size-3.5" />
          登録
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {feeds.map((f) => (
          <li
            key={f.name}
            className="border-border-default flex items-center gap-3 rounded-lg border px-3 py-2.5"
          >
            <CompanyGlyph label={f.glyph} />
            <span className="text-fg-default min-w-0 flex-1 truncate text-sm font-medium">
              {f.name}
            </span>
            <span className="rounded-pill bg-accent flex h-5 w-9 items-center justify-end px-0.5">
              <span className="bg-bg-surface text-accent grid size-4 place-items-center rounded-full">
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
      <div className="bg-accent-soft rounded-md px-4 py-3">
        <div className="mb-2 flex items-center gap-1.5">
          <Sparkles className="text-accent size-3.5" aria-hidden />
          <span className="text-accent text-xs font-bold tracking-wide">AI要約</span>
        </div>
        <ul className="flex flex-col gap-1.5">
          {bullets.map((b) => (
            <li key={b} className="text-fg-default flex gap-2 text-sm leading-snug">
              <Check className="text-accent mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="bg-bg-surface text-accent rounded-full px-2 py-0.5 text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="text-accent/80 mt-2.5 text-xs">
          元記事の内容を AI が要約したものです。正確性は保証されません。
        </p>
      </div>
    </VisualFrame>
  );
}
