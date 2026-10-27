import { describe, expect, it, vi } from 'vitest';
import { asCompanyId } from '@/shared/type-utils';
import type { CompanyDetail, CompanyRepository } from '../domain/company-repository';
import { getCompany } from './get-company';

function fakeRepo(found: CompanyDetail | null): CompanyRepository {
  return {
    listEnabledWithCounts: vi.fn(),
    findBySlug: vi.fn().mockResolvedValue(found),
    findLastIngestAttemptAt: vi.fn(),
  } as unknown as CompanyRepository;
}

describe('getCompany', () => {
  it('有効な企業が無ければ ok(null) を返す', async () => {
    const repo = fakeRepo(null);
    const result = await getCompany({ companies: repo })('nope');
    expect(repo.findBySlug).toHaveBeenCalledExactlyOnceWith('nope');
    expect(result).toEqual({ ok: true, value: null });
  });

  it('企業が見つかれば表示に必要な項目を DTO にして返す', async () => {
    const company: CompanyDetail = {
      id: asCompanyId('c1'),
      slug: 'acme',
      name: 'Acme',
      brandColor: '#ff0000',
      siteUrl: 'https://acme.example.com',
      articleCount: 12,
      description: '説明文',
    };
    const result = await getCompany({ companies: fakeRepo(company) })('acme');
    expect(result).toEqual({ ok: true, value: company });
  });
});
