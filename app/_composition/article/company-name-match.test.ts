import { describe, expect, test } from 'vitest';
import { matchesCompanyName } from './company-name-match';

describe('matchesCompanyName', () => {
  test('空・空白のみのクエリは全件一致する', () => {
    expect(matchesCompanyName('メルカリ', '')).toBe(true);
    expect(matchesCompanyName('メルカリ', '  ')).toBe(true);
  });

  test('部分一致する', () => {
    expect(matchesCompanyName('メルカリ', 'カリ')).toBe(true);
    expect(matchesCompanyName('メルカリ', 'ヤフー')).toBe(false);
  });

  test('大文字小文字と全角半角を区別しない', () => {
    expect(matchesCompanyName('DeNA', 'dena')).toBe(true);
    expect(matchesCompanyName('DeNA', 'ＤＥＮＡ')).toBe(true);
  });
});
