import { parseReadMode } from '@/features/feed/domain/feed-sort';
import { getCategoryDefinition, isArticleCategory } from '@/shared/categories';

const MAX_LABEL = 40;

function clip(value: string): string {
  const chars = [...value];
  return chars.length > MAX_LABEL ? `${chars.slice(0, MAX_LABEL).join('')}…` : value;
}

/**
 * フィード(/)の絞り込み・人気順のときだけ付けるタブ/履歴用のタイトル。無指定なら undefined(既定タイトル)。
 * 検索やタグを切り替えても全部同じ「テクブロ｜…」だと、複数タブやブラウザ履歴で見分けがつかない。
 * 検索が優先(検索語とタグの併用時は検索語を出す)、次にタグ、企業(1 社だけ選んだとき)、カテゴリ、未読/既読、
 * 最後に人気順(新着順は既定タイトルのまま)。
 */
export function feedPageTitle(params: {
  q?: string;
  tag?: string;
  company?: string;
  /** 生の ?category=。有効なカテゴリキーのときだけ表示名にする。 */
  category?: string;
  /** 生の ?read=。'unread' / 'read' 以外は無視する(parseReadMode と同じ解釈)。 */
  read?: string;
  /** 生の ?feed=(マイフィード)。マイフィードで絞っているときは未読/既読をタイトルにしない(見出しと揃える)。 */
  feed?: string;
  sort?: 'latest' | 'popular';
}): string | undefined {
  const q = params.q?.trim();
  if (q) return `「${clip(q)}」の検索結果`;
  const tag = params.tag?.trim();
  if (tag) return `#${clip(tag)} の記事`;
  const company = params.company?.trim();
  if (company) return `${clip(company)} の記事`;
  const category = params.category?.trim();
  if (isArticleCategory(category)) return `${getCategoryDefinition(category).label} の記事`;
  const read = params.feed?.trim() ? 'all' : parseReadMode(params.read?.trim());
  if (read === 'unread') return '未読の記事';
  if (read === 'read') return '既読の記事';
  if (params.sort === 'popular') return '人気の記事';
  return undefined;
}
