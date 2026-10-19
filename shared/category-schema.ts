import { z } from 'zod';
import { ARTICLE_CATEGORIES } from './categories';

/**
 * 記事カテゴリの Zod スキーマ(AI 出力・入力の検証用。定義は `shared/categories.ts`)。
 * zod をクライアントのバンドルに載せないため、カテゴリ定数とは別モジュールに分けている(ADR-0042)。
 * クライアントから読まれるコードでは `isArticleCategory` を使うこと。
 */
export const articleCategorySchema = z.enum(ARTICLE_CATEGORIES);
