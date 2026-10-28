'use client';

import { Bookmark, Heart } from 'lucide-react';
import Link from 'next/link';
import { memo, type ReactNode } from 'react';
import { CompanyFavicon } from '@/components/ui/company-favicon';
import type { ArticleCard as ArticleCardType } from '../../application/dto';
import { stripHtml } from '../strip-html';
import { ArticleLink } from './article-link';
import { RelativeTime } from './relative-time';

/**
 * 記事カード(案A: 上罫)。面・影・角丸を持たず、頭に 1.5px の罫を引くだけで
 * 「1本ずつのまとまり」を作る(docs/adr/0011, ADR-0035)。
 * teal は罫線と hover/focus の文字色にのみ使い、塗りは使わない。
 *
 * カードを押すと記事ページ(/a/[id])へ遷移する(元記事へはそのページのボタンから)。
 * X / Threads と同じ「タイムライン → 個別ページ」の形で、戻る操作・共有・新規タブが
 * ブラウザ標準のまま働く(ADR-0036)。Cmd/Ctrl/Shift+クリックは記事ページを新規タブで開く。
 *
 * 保存系アクションは feature 境界を越えないよう `actions` スロットで app 層から注入する。
 * 未指定時(未ログイン等)は無効状態のダミーボタンを表示。
 */
export const ArticleCard = memo(function ArticleCard({
  article,
  overview,
  tags,
  actions,
  showHatenaCount,
}: {
  article: ArticleCardType;
  /** AI要約の概要(1文)。要約が無い/未生成の記事は RSS 抜粋(description)にフォールバックする。app 層から注入する(feed は ai-summary を import しない)。 */
  overview?: string | null;
  /** AI要約が生成した表示用タグ。要約が無い/未生成の記事は空配列。app 層から注入する(feed は ai-summary を import しない)。 */
  tags?: string[];
  actions?: ReactNode;
  /**
   * はてなブックマーク数の表示可否。既定は false(非表示)。
   * はてブ数は一覧のノイズになるため既定で出さない。並び順の根拠になる人気順のときだけ呼び出し側が true にする。
   */
  showHatenaCount?: boolean;
}) {
  const overviewText = overview || (article.description ? stripHtml(article.description) : null);
  const hatenaLabel = `はてなブックマーク ${article.hatenaBookmarkCount} 件`;

  return (
    // cursor-pointer は iOS Safari 対策。stretched link(::after で全面化)領域を
    // iOS が「クリック可能」と認識してタップで click を発火させる(記事ページへ遷移する)。
    // 罫線は頭(border-top)だけ。hover/focus は色と太さだけを変え、面・影は一切使わない(ADR-0011)。
    // フォーカスによる罫の強調はタイトルリンク(data-detail-trigger)にフォーカスがある時だけに限定する
    // (保存ボタンにフォーカスした時にまで上罫が太くなると、何にフォーカスしているか誤解を招くため)。
    <div
      data-article-card
      data-article-url={article.url}
      className="group relative flex cursor-pointer touch-manipulation flex-col border-border-default border-t-[1.5px] pt-4 transition-colors hover:border-accent has-[[data-detail-trigger]:focus-visible]:border-accent has-[[data-detail-trigger]:focus-visible]:border-t-[3px] has-[[data-detail-trigger]:focus-visible]:pt-[calc(1rem-1.5px)]"
    >
      {/* 見出し行: 企業ファビコン + 企業名 / 右端に日時。
          日時は「いつの記事か」をカードを読む前に判断する情報なので、フッターではなく
          企業名と同じ行の右端に出す(視線が最初に通る位置)。フッター行を1行減らせるため
          カード下部の余白も詰まる。はてブ数は同じ「記事のメタ」なので日時の隣に並べる
          (人気順のときだけ表示。並び順の根拠になるため)。 */}
      <div className="mb-2.5 flex items-center gap-[7px] font-semibold text-[11.5px] text-fg-default md:mb-3">
        <CompanyFavicon url={article.url} name={article.company.name} size={20} />
        <span className="min-w-0 truncate">{article.company.name}</span>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 font-normal text-fg-muted">
          <RelativeTime date={article.publishedAt} />
          {showHatenaCount && article.hatenaBookmarkCount > 0 && (
            <>
              <span aria-hidden="true">・</span>
              <span title={hatenaLabel} className="inline-flex items-baseline gap-1">
                {/* 数字だけだと何の数か分からない(日時の隣で並び順の根拠になる)ので出典を添える。 */}
                <span aria-hidden="true" className="text-[11px]">
                  はてブ
                </span>
                <span className="sr-only">はてなブックマーク </span>
                <span className="font-metric font-semibold text-fg-default">
                  {article.hatenaBookmarkCount}
                </span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* タイトル(stretched link)。記事ページへ遷移する。
          prefetch は Link の既定(auto)に任せる: ビューポートに入ったカードだけが静的シェルを
          先読みするので、24枚の一覧でも先読みは画面内の数枚に収まる。
          ただし auto の先読みは記事ページの枠(skeleton)までなので、hover / touchstart で
          本文まで含めた full prefetch に切り替える(unstable_dynamicOnHover。ADR-0042)。
          本文は 'use cache: remote' なので、この先読みもほぼ DB 往復なしで返る。 */}
      <h2 className="mb-2 line-clamp-3 font-bold text-[1.125rem] text-fg-default leading-[1.46] tracking-[-0.015em]">
        <ArticleLink
          article={article}
          source="feed"
          // 上罫とタイトルのフォーカス強調(has-[[data-detail-trigger]:focus-visible])の目印。
          data-detail-trigger
          // j/k ショートカットが辿る対象の目印(keyboard-shortcuts.tsx)。
          data-article-link
          className="transition-colors after:absolute after:inset-0 focus-visible:outline-none group-hover:text-accent group-has-[[data-detail-trigger]:focus-visible]:text-accent group-has-[[data-detail-trigger]:focus-visible]:underline group-has-[[data-detail-trigger]:focus-visible]:decoration-[1.5px] group-has-[[data-detail-trigger]:focus-visible]:underline-offset-4"
        >
          {article.title}
        </ArticleLink>
      </h2>

      {/* 抜粋: AI要約の概要優先、無ければ RSS 抜粋 */}
      {overviewText && (
        <p className="line-clamp-2 text-[13.5px] text-fg-muted leading-[1.75]">{overviewText}</p>
      )}

      {/*
        最終行: AI生成タグ(最大3個・1行)+ 右端に保存系アクション。
        以前はタグ行と「日時 + 保存ボタン」のフッター行が別々で、44px のボタンを含む行が
        まるごと1本積まれてカード下部だけが間延びしていた。日時を見出し行へ移したことで
        この行に残るのはタグとボタンだけになったので、1行に統合して高さを揃える。
        タグが無い記事(要約未生成)はボタンだけが右端に出る。
        タグは ADR-0035 の「teal は線と文字色だけ・塗りを使わない」に合わせ輪郭のみのバッジにし、
        1行に収まらない分は折り返さず隠す。
        z-10 で stretched link(::after)より上に出るため、ボタンのクリックはボタンに当たり
        記事ページへは遷移しない。
      */}
      <div className="relative z-10 mt-auto flex items-center gap-2 pt-3 md:pt-4">
        {tags && tags.length > 0 && (
          <ul
            aria-label="AI生成タグ"
            // overflow-hidden が ::before の当たり判定(上下に広げた分)を切らないよう、
            // 上下 padding で余白を確保し同量の負マージンで行高は変えない。
            className="-my-1.5 flex min-w-0 flex-1 flex-nowrap gap-1.5 overflow-hidden py-1.5"
          >
            {tags.slice(0, 3).map((tag) => (
              <li key={tag} className="shrink-0">
                {/* タグ絞り込み(?tag=)への入口。一覧に数十個並ぶため prefetch しない。
                    輪郭と文字だけ teal にし塗りは使わない(ADR-0035)。
                    before は見た目の高さを変えずにタップ領域だけ上下へ広げる。 */}
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
        {/* 保存ボタンはポインタ環境では hover/focus-within でだけ出し、常時表示だと一覧のノイズになる。
            タッチ端末(coarse pointer)は hover が無いため常時表示にする。
            -my-2.5 は当たり判定(44px)を維持したまま行高だけ詰めるための負マージン
            (44px をそのまま積むと 1 枚あたり 20px が余白になる)。 */}
        <div className="-my-2.5 ml-auto flex shrink-0 items-center gap-3 opacity-0 pointer-coarse:opacity-100 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
          {actions ?? <DisabledActions />}
        </div>
      </div>
    </div>
  );
});

/**
 * 保存系アクションが注入されない場合(未ログイン等)の無効表示。
 */
function DisabledActions() {
  return (
    <>
      <span
        aria-hidden="true"
        className="grid size-11 place-items-center rounded-full text-fg-subtle/50"
      >
        <Bookmark className="size-[17px]" />
      </span>
      <span
        aria-hidden="true"
        className="grid size-11 place-items-center rounded-full text-fg-subtle/50"
      >
        <Heart className="size-[17px]" />
      </span>
    </>
  );
}
