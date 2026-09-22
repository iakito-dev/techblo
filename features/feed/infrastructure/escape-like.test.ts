import { describe, expect, it } from 'vitest';
import { escapeLike } from './escape-like';

describe('escapeLike', () => {
  it('% をエスケープする', () => {
    expect(escapeLike('100%')).toBe('100\\%');
  });

  it('_ をエスケープする', () => {
    expect(escapeLike('snake_case')).toBe('snake\\_case');
  });

  it('\\ をエスケープする', () => {
    expect(escapeLike('a\\b')).toBe('a\\\\b');
  });

  it('メタ文字を含まない日本語はそのまま返す', () => {
    expect(escapeLike('生成AI')).toBe('生成AI');
  });

  it('複合パターンもすべてエスケープする', () => {
    expect(escapeLike('%_\\')).toBe('\\%\\_\\\\');
  });
});
