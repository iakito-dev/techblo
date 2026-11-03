import { describe, expect, it } from 'vitest';
import { articleJsonLd, breadcrumbJsonLd, organizationJsonLd, websiteJsonLd } from './seo';

const BASE = 'https://techblo.dev';

describe('websiteJsonLd', () => {
  it('検索ボックス(?q=)を SearchAction として公開する', () => {
    const ld = websiteJsonLd(BASE) as {
      url: string;
      potentialAction: { target: { urlTemplate: string }; 'query-input': string };
    };
    expect(ld.url).toBe(`${BASE}/`);
    expect(ld.potentialAction.target.urlTemplate).toBe(`${BASE}/?q={search_term_string}`);
    expect(ld.potentialAction['query-input']).toBe('required name=search_term_string');
  });
});

describe('organizationJsonLd', () => {
  it('ロゴは baseUrl 配下の icon.svg を指す', () => {
    expect(organizationJsonLd(BASE).logo).toBe(`${BASE}/icon.svg`);
  });
});

describe('breadcrumbJsonLd', () => {
  it('階層順に position を 1 から振る', () => {
    const ld = breadcrumbJsonLd([
      { name: 'ホーム', url: `${BASE}/` },
      { name: '記事', url: `${BASE}/a/1` },
    ]) as { itemListElement: { position: number; name: string; item: string }[] };
    expect(ld.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: '記事', item: `${BASE}/a/1` },
    ]);
  });

  it('空配列なら空リストを返す', () => {
    expect(breadcrumbJsonLd([]).itemListElement).toEqual([]);
  });
});

describe('articleJsonLd', () => {
  const input = {
    url: `${BASE}/a/1`,
    title: 'タイトル',
    imageUrl: `${BASE}/api/og/1`,
    publishedAt: new Date('2026-10-01T00:00:00.000Z'),
    companyName: 'ACME',
  };

  it('author が無ければ企業名で代替し、description も省く', () => {
    const ld = articleJsonLd(input, BASE);
    expect(ld.author).toEqual({ '@type': 'Person', name: 'ACME' });
    expect(ld).not.toHaveProperty('description');
    expect(ld.datePublished).toBe('2026-10-01T00:00:00.000Z');
  });

  it('author と description があれば出力する', () => {
    const ld = articleJsonLd({ ...input, author: '山田', description: '要約' }, BASE);
    expect(ld.author).toEqual({ '@type': 'Person', name: '山田' });
    expect(ld.description).toBe('要約');
  });

  it('publisher は本サービス、発信元は sourceOrganization で表す', () => {
    const ld = articleJsonLd(input, BASE) as {
      publisher: { name: string; logo: { url: string } };
      sourceOrganization: { name: string };
    };
    expect(ld.publisher.name).toBe('テクブロ');
    expect(ld.publisher.logo.url).toBe(`${BASE}/icon.svg`);
    expect(ld.sourceOrganization.name).toBe('ACME');
  });
});
