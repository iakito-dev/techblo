import { describe, expect, it } from 'vitest';
import { pickKnownSelections } from './known-selections';

describe('pickKnownSelections', () => {
  it('選択肢に無いキーを落とし、残りは URL の順序を保つ', () => {
    expect(pickKnownSelections(['zozo', 'nonexistent', 'mercari'], ['mercari', 'zozo'])).toEqual([
      'zozo',
      'mercari',
    ]);
  });

  it('すべて未知なら空配列を返す', () => {
    expect(pickKnownSelections(['nonexistent'], ['mercari'])).toEqual([]);
  });

  it('選択肢が空(ゲストのマイフィード等)なら何も残さない', () => {
    expect(pickKnownSelections(['feed-1'], [])).toEqual([]);
  });

  it('選択が空なら空配列を返す', () => {
    expect(pickKnownSelections([], ['mercari'])).toEqual([]);
  });
});
