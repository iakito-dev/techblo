import { afterEach, describe, expect, it, vi } from 'vitest';
import { readLastProvider, writeLastProvider } from './last-provider';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => {
      map.delete(k);
    },
    setItem: (k, v) => {
      map.set(k, v);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('last-provider', () => {
  it('書き込んだプロバイダを読み戻せる', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    writeLastProvider('github');
    expect(readLastProvider()).toBe('github');
  });

  it('未記録なら null', () => {
    vi.stubGlobal('localStorage', memoryStorage());
    expect(readLastProvider()).toBeNull();
  });

  it('未知の値が保存されていたら null(改ざん・旧形式に強い)', () => {
    const storage = memoryStorage();
    storage.setItem('techblo:last-auth-provider', 'twitter');
    vi.stubGlobal('localStorage', storage);
    expect(readLastProvider()).toBeNull();
  });

  it('localStorage が使えなくても throw しない', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    });
    expect(readLastProvider()).toBeNull();
    expect(() => writeLastProvider('google')).not.toThrow();
  });
});
