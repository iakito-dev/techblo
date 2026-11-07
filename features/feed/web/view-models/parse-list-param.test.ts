import { describe, expect, it } from 'vitest';
import { parseListParam } from './parse-list-param';

describe('parseListParam', () => {
  it('null / 空文字は空配列', () => {
    expect(parseListParam(null)).toEqual([]);
    expect(parseListParam('')).toEqual([]);
  });

  it('カンマ区切りを配列にする', () => {
    expect(parseListParam('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('前後の空白と空要素を除く', () => {
    expect(parseListParam(' a , ,b,, ')).toEqual(['a', 'b']);
  });

  it('区切りだけなら空配列', () => {
    expect(parseListParam(',,')).toEqual([]);
  });
});
