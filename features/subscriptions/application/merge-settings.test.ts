import { describe, expect, it } from 'vitest';
import { asCompanyId } from '@/shared/type-utils';
import type { CompanyChoice } from '../domain/subscription';
import { mergeSettings } from './merge-settings';

const company = (id: string, name: string): CompanyChoice => ({
  id: asCompanyId(id),
  name,
  slug: name.toLowerCase(),
  brandColor: '#000000',
  siteUrl: `https://${name.toLowerCase()}.example.com`,
});

describe('mergeSettings', () => {
  const companies = [company('c1', 'Alpha'), company('c2', 'Beta'), company('c3', 'Gamma')];

  it('状態行が無い企業は enabled=true(新企業デフォルトON)', () => {
    const result = mergeSettings(companies, []);
    expect(result.map((s) => s.enabled)).toEqual([true, true, true]);
  });

  it('ユーザーの ON/OFF 状態を反映する', () => {
    const result = mergeSettings(companies, [
      { companyId: asCompanyId('c2'), enabled: false },
      { companyId: asCompanyId('c3'), enabled: true },
    ]);
    expect(result.map((s) => [s.companyId, s.enabled])).toEqual([
      ['c1', true],
      ['c2', false],
      ['c3', true],
    ]);
  });

  it('企業の並び順を保持する', () => {
    const result = mergeSettings(companies, []);
    expect(result.map((s) => s.name)).toEqual(['Alpha', 'Beta', 'Gamma']);
  });
});
