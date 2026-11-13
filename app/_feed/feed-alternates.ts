import { getCategoryDefinition, isArticleCategory } from '@/shared/categories';

export type FeedAlternateLink = { url: string; title: string };

/**
 * フィード(/)の絞り込みに対応する公開 RSS(ADR-0039)を、RSS リーダーの自動検出用に列挙する。
 * 今見ている一覧に最も近いフィードを先に、全体フィード(/feed.xml)を最後に置く。
 * - タグ・カテゴリ: /feed.xml?category=&tag=(両方指定なら併用。不正なカテゴリキーは無視)
 * - 企業(1 社に解決できたとき): /companies/<slug>/feed.xml。企業フィードはタグ・カテゴリで絞れないので別の行にする
 * 以前はタグだけを宣言しており、企業やカテゴリで絞った一覧からは専用フィードが見つからなかった。
 */
export function feedAlternateLinks(params: {
  tag?: string;
  category?: string;
  company?: { slug: string; name: string };
}): FeedAlternateLink[] {
  const links: FeedAlternateLink[] = [];

  const tag = params.tag?.trim() || undefined;
  const rawCategory = params.category?.trim();
  const category = isArticleCategory(rawCategory) ? rawCategory : undefined;
  if (tag || category) {
    const query = new URLSearchParams();
    if (category) query.set('category', category);
    if (tag) query.set('tag', tag);
    const label = [category && getCategoryDefinition(category).label, tag && `#${tag}`]
      .filter(Boolean)
      .join(' ');
    links.push({ url: `/feed.xml?${query.toString()}`, title: `${label} の新着` });
  }

  if (params.company) {
    links.push({
      url: `/companies/${encodeURIComponent(params.company.slug)}/feed.xml`,
      title: `${params.company.name} の新着`,
    });
  }

  links.push({ url: '/feed.xml', title: 'テクブロ 新着' });
  return links;
}
