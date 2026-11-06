import { describe, expect, it } from 'vitest';
import { isUuid } from './uuid';

describe('isUuid', () => {
  it('uuid 形式を受け入れる(大文字小文字を問わない)', () => {
    expect(isUuid('00a85357-adba-4cc9-8ce9-4fdbdaeaa763')).toBe(true);
    expect(isUuid('00A85357-ADBA-4CC9-8CE9-4FDBDAEAA763')).toBe(true);
  });

  it('形式が不正な値を弾く', () => {
    expect(isUuid('')).toBe(false);
    expect(isUuid('x')).toBe(false);
    expect(isUuid('00a85357adba4cc98ce94fdbdaeaa763')).toBe(false);
    expect(isUuid('00a85357-adba-4cc9-8ce9-4fdbdaeaa763\n')).toBe(false);
    expect(isUuid('00a85357-adba-4cc9-8ce9-4fdbdaeaa763-extra')).toBe(false);
    expect(isUuid('\u0000')).toBe(false);
  });
});
