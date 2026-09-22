/**
 * 構造化データ(schema.org / JSON-LD)のビルダ。
 * UI から切り離した純粋関数として置き、`components/seo/json-ld.tsx` で描画する。
 * 値は呼び出し側からプリミティブで渡す(features を import しない=逆流防止)。
 */

const SITE_NAME = 'テクブロ';
// 指名検索(ローマ字「techblo」)を Google に紐付けるための別名。WebSite/Organization で公開する。
const SITE_ALTERNATE_NAME = 'techblo';

/**
 * サイト共通の説明文(SERP 向け)。JSON-LD と `metadata.description` の真実源。
 * 先頭にブランド名 + 別名、続けて RSS リーダーである旨と主要機能、末尾に行動喚起を置く。
 * スマホの SERP は全角50字前後で切れるため、差別化要素(自動集約・AI要約)を前半に寄せている。
 * 機能の網羅的な列挙は LP(`app/lp/page.tsx`)側の説明文に持たせ、ここでは重複させない。
 */
export const SITE_DESCRIPTION =
  'テクブロ(techblo)は、有名テック企業の公式技術ブログを毎日自動で集約するRSSリーダーです。AI要約とはてなブックマーク人気順で、今読むべき記事がひと目でわかります。気になる記事は保存して、あとからじっくり読めます。';

/**
 * SNS カード(OGP / Twitter)向けの説明文。SERP 用より短く訴求寄りにする。
 */
export const SITE_SOCIAL_DESCRIPTION =
  '有名テック企業の技術ブログを毎日自動集約。AI要約と人気順で、今読むべき記事がひと目でわかるエンジニア向けWebサービス「テクブロ(techblo)」。';

/**
 * サイト全体を表す WebSite スキーマ。
 * potentialAction(SearchAction)で検索ボックス(?q=)を Google に知らせる(ADR-0022)。
 */
export function websiteJsonLd(baseUrl: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: SITE_ALTERNATE_NAME,
    url: `${baseUrl}/`,
    description: SITE_DESCRIPTION,
    inLanguage: 'ja-JP',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** 運営者を表す Organization スキーマ。 */
export function organizationJsonLd(baseUrl: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    alternateName: SITE_ALTERNATE_NAME,
    url: `${baseUrl}/`,
    logo: `${baseUrl}/icon.svg`,
  };
}

/** パンくず1階層分(name と絶対 URL)。 */
export type BreadcrumbItem = { name: string; url: string };

/**
 * パンくずリスト(BreadcrumbList)スキーマ。SERP のパンくず表示に使う。
 * items は階層順(ホーム → … → 現在ページ)で渡す。
 */
export function breadcrumbJsonLd(items: BreadcrumbItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** 企業ページ(/companies/[slug])の CollectionPage スキーマの入力。 */
export type CompanyCollectionJsonLdInput = {
  /** 企業ページの絶対 URL。 */
  url: string;
  /** 企業名。 */
  companyName: string;
  /** 企業紹介文(無ければサービス側で補う)。 */
  description: string;
  /** 発信元の企業サイト URL。 */
  companySiteUrl: string;
  /** 一覧に並ぶ記事(新着順)。ItemList 化して掲載記事を Google に示す。 */
  articles: { url: string; title: string }[];
};

/**
 * 企業ページの CollectionPage スキーマ。
 * about に発信元 Organization、mainEntity に掲載記事の ItemList を持たせる。
 */
export function companyCollectionJsonLd(
  input: CompanyCollectionJsonLdInput,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${input.companyName}の技術ブログ記事まとめ`,
    url: input.url,
    description: input.description,
    inLanguage: 'ja-JP',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME },
    about: {
      '@type': 'Organization',
      name: input.companyName,
      url: input.companySiteUrl,
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: input.articles.map((a, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: a.url,
        name: a.title,
      })),
    },
  };
}

/** 企業一覧ページ(/companies)の CollectionPage スキーマの入力。 */
export type CompanyListJsonLdInput = {
  /** 一覧ページの絶対 URL。 */
  url: string;
  /** 各企業ページへのリンク。 */
  companies: { url: string; name: string }[];
};

/**
 * 企業一覧ページ(/companies)の CollectionPage + ItemList スキーマ。
 * 各企業ページへのリンクをクローラに示すハブとして機能させる。
 */
export function companyListJsonLd(input: CompanyListJsonLdInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '技術ブログを持つ企業一覧',
    url: input.url,
    inLanguage: 'ja-JP',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: input.companies.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: c.url,
        name: c.name,
      })),
    },
  };
}

/** 記事プレビューページ(/a/[id])を表す Article スキーマの入力。 */
export type ArticleJsonLdInput = {
  url: string;
  title: string;
  description?: string;
  imageUrl: string;
  publishedAt: Date;
  /** 記事の書き手。無ければ発信元企業名で代替する。 */
  author?: string;
  /** 発信元の企業(技術ブログ)名。 */
  companyName: string;
};

/**
 * 記事プレビューページの Article スキーマ。
 * publisher は本サービス(テクブロ)、発信元企業は author/sourceOrganization で表す。
 */
export function articleJsonLd(input: ArticleJsonLdInput, baseUrl: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
    headline: input.title,
    ...(input.description ? { description: input.description } : {}),
    image: input.imageUrl,
    datePublished: input.publishedAt.toISOString(),
    inLanguage: 'ja-JP',
    author: { '@type': 'Person', name: input.author ?? input.companyName },
    sourceOrganization: { '@type': 'Organization', name: input.companyName },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: `${baseUrl}/icon.svg` },
    },
  };
}
