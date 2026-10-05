import { Check, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { ArticleSummaryBullet } from '@/features/ai-summary/domain/article-summary';

/**
 * AI要約の表示(プレゼンテーショナル / データ取得なし)。
 * 記事ページ(/a/[id])に表示する。AI生成であることと出典(元記事)を明示する(ADR-0026)。
 *
 * デザイン: ティール左罫のコールアウト。概要(プロローグ1文)+ 各要点を「見出し + 説明」で示す。
 * アクセント色は塗りに使わず左罫(border-l-2 teal)と文字色だけで要約ブロックを示す
 * (ADR-0035: teal は線と文字色のみ)。タグは一覧カードの AI タグと同じ輪郭のみのバッジにして、
 * カードから開いた続きとして同じ部品に見せる。
 */
export function SummaryView({
  overview,
  bullets,
  tags,
}: {
  overview: string;
  bullets: ArticleSummaryBullet[];
  tags: string[];
}) {
  if (overview.length === 0 && bullets.length === 0 && tags.length === 0) return null;

  return (
    <section aria-label="AI要約" className="border-accent border-l-2 py-0.5 pl-4">
      {/* ラベルはカードの見出し行と同じ 11.5px 太字にして、ページ内の小見出しの階層を1種類に揃える */}
      <div className="mb-2 flex h-4 items-center gap-1.5">
        <Sparkles className="size-3.5 text-accent" aria-hidden />
        <span className="font-bold text-[11.5px] text-accent tracking-wide">AI要約</span>
      </div>
      {overview.length > 0 && (
        <p className="mb-3 text-[15px] text-fg-default leading-[1.8]">{overview}</p>
      )}
      <ul className="flex flex-col gap-2.5">
        {bullets.map((b) => (
          <li key={b.heading} className="flex gap-2 text-fg-default text-sm leading-[1.7]">
            <Check className="mt-[5px] size-3.5 shrink-0 text-accent" aria-hidden />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold">{b.heading}</span>
              {b.detail.length > 0 && <span className="text-fg-muted">{b.detail}</span>}
            </div>
          </li>
        ))}
      </ul>
      {tags.length > 0 && (
        <ul aria-label="AI生成タグ" className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li key={tag}>
              {/* 一覧カードのタグと同じ絞り込み入口(?tag=)。hover/focus は輪郭と文字だけ teal(ADR-0035) */}
              <Link
                href={`/?tag=${encodeURIComponent(tag)}`}
                prefetch={false}
                className="relative block rounded-full border border-border-default px-2 text-[11px] text-fg-muted leading-5 transition-colors before:absolute before:inset-x-0 before:-inset-y-1.5 hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent focus-visible:outline-none"
              >
                {tag}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {/* 断り書きは強調ではなく注記なので teal ではなく subtle にする(文字色の teal はラベル・見出しに限る) */}
      <p className="mt-2.5 text-[11.5px] text-fg-subtle leading-[1.6]">
        元記事の内容を AI が要約したものです。正確性は保証されません。
      </p>
    </section>
  );
}
