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
});
