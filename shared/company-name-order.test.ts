import { describe, expect, it } from 'vitest';
import { compareCompanyNames } from './company-name-order';

describe('compareCompanyNames', () => {
  it('大文字小文字を区別せず英字順に並べ、かな・漢字はその後ろに置く', () => {
    const names = [
      'ログラス',
      'mercari',
      'ZOZO',
      'AWS Japan',
      'freee',
      'Anthropic Engineering',
      'エウレカ',
    ];
    expect([...names].sort(compareCompanyNames)).toEqual([
      'Anthropic Engineering',
      'AWS Japan',
      'freee',
      'mercari',
      'ZOZO',
      'エウレカ',
      'ログラス',
    ]);
  });
});
