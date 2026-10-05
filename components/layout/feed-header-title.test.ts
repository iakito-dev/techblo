import { describe, expect, it } from 'vitest';
import { isFeedDefaultView, resolveFeedHeaderTitle } from './feed-header-title';

describe('resolveFeedHeaderTitle', () => {
  it('category ありはそのカテゴリの表示名を返す', () => {
    expect(resolveFeedHeaderTitle({ category: 'ai' })).toBe('AI・機械学習');
  });

  it('category 無し・sort=latest のみの新着一覧は「新着」を返す', () => {
    expect(resolveFeedHeaderTitle({ sort: 'latest' })).toBe('新着');
  });

  it('検索・企業・既読・人気順などその他の条件は「フィード」を返す', () => {
    expect(resolveFeedHeaderTitle({ q: 'nextjs' })).toBe('フィード');
    expect(resolveFeedHeaderTitle({ company: 'acme' })).toBe('フィード');
    expect(resolveFeedHeaderTitle({ read: 'unread' })).toBe('フィード');
    expect(resolveFeedHeaderTitle({ sort: 'popular' })).toBe('フィード');
    expect(resolveFeedHeaderTitle({})).toBe('フィード');
  });

  it('tag ありは「#タグ名」を返す(前後の空白は除く)', () => {
    expect(resolveFeedHeaderTitle({ tag: '生成AI' })).toBe('#生成AI');
    expect(resolveFeedHeaderTitle({ tag: ' Go ', sort: 'popular' })).toBe('#Go');
  });

  it('tag が空白のみなら「フィード」を返す', () => {
    expect(resolveFeedHeaderTitle({ tag: '  ' })).toBe('フィード');
  });

  it('category と tag が両方あれば category を優先する', () => {
    expect(resolveFeedHeaderTitle({ category: 'ai', tag: 'Go' })).toBe('AI・機械学習');
  });

  it('不正な category キーは「フィード」に丸める', () => {
    expect(resolveFeedHeaderTitle({ category: 'not-a-category' })).toBe('フィード');
  });

  it('category と他条件が両方あっても category を優先する', () => {
    expect(resolveFeedHeaderTitle({ category: 'infra', sort: 'popular' })).toBe(
      'クラウド・インフラ',
    );
  });
});

describe('isFeedDefaultView', () => {
  it('何も指定が無ければ既定状態', () => {
    expect(isFeedDefaultView({})).toBe(true);
  });

  it('category が指定されていれば既定状態ではない', () => {
    expect(isFeedDefaultView({ category: 'ai' })).toBe(false);
  });

  it('sort=latest のみ(新着一覧)も既定状態ではない', () => {
    expect(isFeedDefaultView({ sort: 'latest' })).toBe(false);
  });

  it('tag が指定されていれば既定状態ではない', () => {
    expect(isFeedDefaultView({ tag: 'Go' })).toBe(false);
  });

  it('他の絞り込みがあれば既定状態ではない', () => {
    expect(isFeedDefaultView({ q: 'nextjs' })).toBe(false);
  });
});
