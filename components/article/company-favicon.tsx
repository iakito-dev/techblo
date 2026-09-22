'use client';

import { useState } from 'react';

/**
 * Zenn publication の slug をパスから取り出す。
 * - サイドバー siteUrl: `https://zenn.dev/p/{slug}`
 * - 記事 URL: `https://zenn.dev/{slug}/articles/xxxx`
 * いずれも先頭セグメント(`p` の場合は次)が publication slug。
 */
function zennPublicationSlug(pathname: string): string | null {
  const seg = pathname.split('/').filter(Boolean);
  const slug = seg[0] === 'p' ? seg[1] : seg[0];
  return slug ?? null;
}

/** 表示サイズ別のクラス。Tailwind は動的なクラス名を検出できないため静的に持つ。 */
const SIZE_CLASS = {
  16: { box: 'size-4', text: 'text-[0.5625rem]' },
  20: { box: 'size-5', text: 'text-[0.6875rem]' },
} as const;

/**
 * 企業ファビコン(既定 16px)。企業マスタにロゴが無いため、URL のドメインから
 * Google favicon サービスで取得する。失敗時は頭文字にフォールバック。
 * 記事カード(article.url)とサイドバー(siteUrl)で共用する横断 UI。
 *
 * `size` は記事カードだけ 20px にする。カードは上罫を hairline まで落としたため、
 * 「ここから次の記事」の目印はファビコン + 企業名の見出し行が担う。16px だと一覧を
 * 流し読みするときにその目印が弱い。他の面(サイドバー・絞り込みシート・設定の一覧)は
 * 行の高さが決まっていて目印を強める必要がないので 16px のまま。
 * 取得する画像は元々 32px(`sz=32`)なので 20px 表示でも解像度は足りる。
 *
 * 例外として Zenn(zenn.dev)は全社同一ドメインで Google favicon が共通ロゴに
 * なるため、publication 固有アバターを返す内部ルート /api/zenn-icon を使う。
 */
export function CompanyFavicon({
  url,
  name,
  size = 16,
}: {
  url: string;
  name: string;
  size?: 16 | 20;
}) {
  const { box, text } = SIZE_CLASS[size];
  const [failed, setFailed] = useState(false);
  let domain: string | null = null;
  let src: string | null = null;
  try {
    const parsed = new URL(url);
    domain = parsed.hostname;
    const zennSlug = domain === 'zenn.dev' ? zennPublicationSlug(parsed.pathname) : null;
    src = zennSlug
      ? `/api/zenn-icon?slug=${encodeURIComponent(zennSlug)}`
      : `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    domain = null;
  }

  if (!domain || !src || failed) {
    return (
      <span
        aria-hidden="true"
        className={`grid ${box} ${text} shrink-0 place-items-center rounded-sm bg-bg-surface-2 font-semibold text-fg-muted ring-1 ring-border-card`}
      >
        {name.charAt(0)}
      </span>
    );
  }
  return (
    // biome-ignore lint/performance/noImgElement: 16〜20px の外部ファビコンは next/image の最適化対象にせず remotePatterns も増やさない
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      // 白背景ロゴ対策: 薄グレー地 + 極薄リングで「ロゴタイル」として輪郭を出す
      className={`${box} shrink-0 rounded-sm bg-bg-surface-2 ring-1 ring-border-card`}
    />
  );
}
