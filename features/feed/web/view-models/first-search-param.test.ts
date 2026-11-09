import { describe, expect, it } from 'vitest';
import { firstSearchParams } from './first-search-param';

describe('firstSearchParams', () => {
  it('文字列の値はそのまま返す', () => {
    expect(firstSearchParams({ tag: 'React', q: 'next' })).toEqual({ tag: 'React', q: 'next' });
  });

  it('キーが繰り返された(配列の)値は最初の要素だけを採る', () => {
    expect(firstSearchParams({ tag: ['React', 'SRE'], company: ['a', 'b'] })).toEqual({
      tag: 'React',
      company: 'a',
    });
  });

  it('undefined と空配列のキーは落とす', () => {
    expect(firstSearchParams({ tag: undefined, company: [] })).toEqual({});
  });

  it('空文字は残す(空判定は呼び出し側の trim で行う)', () => {
    expect(firstSearchParams({ q: '' })).toEqual({ q: '' });
  });
});
