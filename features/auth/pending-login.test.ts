import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearPendingLogin,
  isNewlyCreatedUser,
  markPendingLogin,
  takePendingLogin,
} from './pending-login';

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

describe('pending-login', () => {
  it('記録したプロバイダを1度だけ取り出せる', () => {
    vi.stubGlobal('sessionStorage', memoryStorage());
    markPendingLogin('discord');
    expect(takePendingLogin()).toBe('discord');
    expect(takePendingLogin()).toBeNull();
  });

  it('clear 後は取り出せない', () => {
    vi.stubGlobal('sessionStorage', memoryStorage());
    markPendingLogin('google');
    clearPendingLogin();
    expect(takePendingLogin()).toBeNull();
  });

  it('未知の値は null', () => {
    const storage = memoryStorage();
    storage.setItem('techblo:pending-login-provider', 'twitter');
    vi.stubGlobal('sessionStorage', storage);
    expect(takePendingLogin()).toBeNull();
  });

  it('sessionStorage が使えなくても例外を投げない', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    });
    expect(() => markPendingLogin('github')).not.toThrow();
    expect(takePendingLogin()).toBeNull();
  });
});

describe('isNewlyCreatedUser', () => {
  const now = new Date('2026-10-24T12:00:00Z');

  it('作成から10分以内なら新規登録', () => {
    expect(isNewlyCreatedUser(new Date('2026-10-24T11:55:00Z'), now)).toBe(true);
  });

  it('それより前に作られたユーザーは既存ユーザーのログイン', () => {
    expect(isNewlyCreatedUser(new Date('2026-10-20T12:00:00Z'), now)).toBe(false);
  });

  it('文字列の日時も受け付け、不正値は false', () => {
    expect(isNewlyCreatedUser('2026-10-24T11:59:00Z', now)).toBe(true);
    expect(isNewlyCreatedUser('not-a-date', now)).toBe(false);
  });
});
