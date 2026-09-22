/**
 * 記事のプレビュー画像の解決。
 * OGP 画像があればそれを、無ければアプリ生成のプレースホルダ(/api/og/{id}、
 * AI要約 or タイトルを主役にしたカード)をデフォルトとして使う(ADR-0004 / ADR-0029)。
 */
export function articleFallbackImage(articleId: string): string {
  return `/api/og/${articleId}`;
}

export function articleImageSrc(article: { id: string; ogImage: string | null }): string {
  return article.ogImage ?? articleFallbackImage(article.id);
}
