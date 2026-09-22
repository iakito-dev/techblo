/**
 * Branded 型。プリミティブ(string 等)に名目的な型タグを付け、
 * ArticleId と CompanyId の取り違えをコンパイル時に防ぐ。
 */

declare const __brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [__brand]: B };

// feature 横断で使う ID 型。DB の uuid 文字列をドメイン上で区別する。
export type ArticleId = Brand<string, 'ArticleId'>;
export type CompanyId = Brand<string, 'CompanyId'>;
export type UserId = Brand<string, 'UserId'>;
export type UserFeedId = Brand<string, 'UserFeedId'>;

export const asArticleId = (s: string): ArticleId => s as ArticleId;
export const asCompanyId = (s: string): CompanyId => s as CompanyId;
export const asUserId = (s: string): UserId => s as UserId;
export const asUserFeedId = (s: string): UserFeedId => s as UserFeedId;
