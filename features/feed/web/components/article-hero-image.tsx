'use client';

import { useState } from 'react';
import type { ArticleCard as ArticleCardType } from '../../application/dto';
import { articleFallbackImage, articleImageSrc } from '../article-image';

/**
 * 記事のヒーロー画像。OGP があればそれを、無ければアプリ生成のプレースホルダを表示。
 * OGP の URL が読み込み失敗(404 / ホットリンク拒否)した場合もプレースホルダへフォールバック。
 * 記事ページ(/a/[id])で使う。
 *
 * href を渡すと画像全体を元記事へのリンクにする(新規タブ・クリックで元記事へ遷移)。
 */
export function ArticleHeroImage({
  article,
  className,
  href,
}: {
  article: ArticleCardType;
  className?: string;
  href?: string;
}) {
  const fallback = articleFallbackImage(article.id);
  const [src, setSrc] = useState(() => articleImageSrc(article));
  const img = (
    // biome-ignore lint/performance/noImgElement: 外部 OGP は next/image の最適化対象外(ADR-0004)
    <img
      src={src}
      alt=""
      onError={() => {
        if (src !== fallback) setSrc(fallback);
      }}
      className={
        // 既定は記事ページと同じ角丸なし + hairline の輪郭(ADR-0035: 面・角丸を使わない)
        className ?? 'aspect-[1200/630] w-full object-cover ring-1 ring-border-default ring-inset'
      }
    />
  );

  if (!href) return img;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="元記事を開く"
      className="block cursor-pointer transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
    >
      {img}
    </a>
  );
}
