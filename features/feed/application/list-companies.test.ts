import { describe, expect, it, vi } from 'vitest';
import type { CompanyRepository } from '../domain/company-repository';
import { listCompanies } from './list-companies';

describe('listCompanies', () => {
  it('有効な企業を記事数つきの DTO に写して ok で返す', async () => {
    const row = {
      id: 'c1',
      slug: 'mercari',
      name: 'mercari',
      brandColor: '#ff0211',
      siteUrl: 'https://engineering.mercari.com',
      articleCount: 6,
      // DTO に出してはいけない内部項目が混ざっても落とす
      rssUrl: 'https://example.com/rss',
    };
    const companies = {
      listEnabledWithCounts: vi.fn().mockResolvedValue([row]),
    } as unknown as CompanyRepository;
    const result = await listCompanies({ companies })();
    expect(result).toEqual({
      ok: true,
      value: [
        {
          id: 'c1',
          slug: 'mercari',
          name: 'mercari',
          brandColor: '#ff0211',
          siteUrl: 'https://engineering.mercari.com',
          articleCount: 6,
        },
      ],
    });
  });

  it('企業が 0 件なら空配列を ok で返す', async () => {
    const companies = {
      listEnabledWithCounts: vi.fn().mockResolvedValue([]),
    } as unknown as CompanyRepository;
    expect(await listCompanies({ companies })()).toEqual({ ok: true, value: [] });
  });

  it('記事数の多い順に並べ、同数の企業は企業名順にする', async () => {
    const row = (name: string, articleCount: number) => ({
      id: name,
      slug: name,
      name,
      brandColor: null,
      siteUrl: `https://${name}.example.com`,
      articleCount,
    });
    // リポジトリが同数の企業を任意の順で返しても、結果の並びは変わらない
    const companies = {
      listEnabledWithCounts: vi
        .fn()
        .mockResolvedValue([
          row('ログラス', 3),
          row('ZOZO', 0),
          row('ANDPAD', 3),
          row('mercari', 10),
          row('Cybozu', 0),
        ]),
    } as unknown as CompanyRepository;
    const result = await listCompanies({ companies })();
    expect(result.ok && result.value.map((c) => c.name)).toEqual([
      'mercari',
      'ANDPAD',
      'ログラス',
      'Cybozu',
      'ZOZO',
    ]);
  });
});
