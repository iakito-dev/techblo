import { describe, expect, it } from 'vitest';
import { isFeedDefaultView, resolveFeedHeaderTitle } from './feed-header-title';

describe('resolveFeedHeaderTitle', () => {
  it('category ありはそのカテゴリの表示名を返す', () => {
    expect(resolveFeedHeaderTitle({ category: 'ai' })).toBe('AI・機械学習');
  });

  it('category 無し・sort=latest のみの新着一覧は「新着」を返す', () => {
    expect(resolveFeedHeaderTitle({ sort: 'latest' })).toBe('新着');
  });

  it('企業・既読などその他の条件は「フィード」を返す', () => {
    expect(resolveFeedHeaderTitle({ company: 'acme' })).toBe('フィード');
    expect(resolveFeedHeaderTitle({ read: 'unread' })).toBe('フィード');
    expect(resolveFeedHeaderTitle({ sort: 'popular', company: 'acme' })).toBe('フィード');
    expect(resolveFeedHeaderTitle({ sort: 'popular', read: 'unread' })).toBe('フィード');
    expect(resolveFeedHeaderTitle({})).toBe('フィード');
  });

  it('検索中は「検索結果」を返す', () => {
    expect(resolveFeedHeaderTitle({ q: 'nextjs' })).toBe('検索結果');
    expect(resolveFeedHeaderTitle({ q: 'nextjs', sort: 'popular' })).toBe('検索結果');
    expect(resolveFeedHeaderTitle({ q: '  ' })).toBe('フィード');
  });

  it('人気順は「人気の記事」を返す(期間の指定は可)', () => {
    expect(resolveFeedHeaderTitle({ sort: 'popular' })).toBe('人気の記事');
    expect(resolveFeedHeaderTitle({ sort: 'popular', period: '7d' })).toBe('人気の記事');
  });

  it('企業名が渡されれば企業名を返す(人気順・既読の絞り込みと併用しても)', () => {
    expect(resolveFeedHeaderTitle({ company: 'acme' }, { companyName: 'ACME' })).toBe('ACME');
    expect(
      resolveFeedHeaderTitle({ company: 'acme', sort: 'popular' }, { companyName: 'ACME' }),
    ).toBe('ACME');
    expect(
      resolveFeedHeaderTitle({ company: 'acme', read: 'unread' }, { companyName: 'ACME' }),
    ).toBe('ACME');
  });

  it('企業名より category・tag・検索を優先する', () => {
    const options = { companyName: 'ACME' };
    expect(resolveFeedHeaderTitle({ company: 'acme', category: 'ai' }, options)).toBe(
      'AI・機械学習',
    );
    expect(resolveFeedHeaderTitle({ company: 'acme', tag: 'Go' }, options)).toBe('#Go');
    expect(resolveFeedHeaderTitle({ company: 'acme', q: 'nextjs' }, options)).toBe('検索結果');
  });

  it('企業名が空白のみなら従来どおりの見出しに戻る', () => {
    expect(resolveFeedHeaderTitle({ company: 'acme' }, { companyName: '  ' })).toBe('フィード');
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
