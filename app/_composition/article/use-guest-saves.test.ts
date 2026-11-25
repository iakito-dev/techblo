import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readGuestSaves, setGuestSave, toggleGuestSave } from './use-guest-saves';

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

let win: EventTarget & { localStorage: Storage };

beforeEach(() => {
  win = Object.assign(new EventTarget(), { localStorage: memoryStorage() });
  vi.stubGlobal('window', win);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('toggleGuestSave', () => {
  it('別々の記事を続けて保存すると両方残る(前の保存を上書きしない)', () => {
    expect(toggleGuestSave('bookmark', 'a')).toBe(true);
    expect(toggleGuestSave('bookmark', 'b')).toBe(true);
    expect(toggleGuestSave('bookmark', 'c')).toBe(true);
    expect(readGuestSaves('bookmark')).toEqual(['a', 'b', 'c']);
  });

  it('保存済みの記事は解除し、他の記事は残す', () => {
    toggleGuestSave('bookmark', 'a');
    toggleGuestSave('bookmark', 'b');
    expect(toggleGuestSave('bookmark', 'a')).toBe(false);
    expect(readGuestSaves('bookmark')).toEqual(['b']);
  });

  it('種類ごとに独立して保存する', () => {
    toggleGuestSave('bookmark', 'a');
    toggleGuestSave('favorite', 'b');
    expect(readGuestSaves('bookmark')).toEqual(['a']);
    expect(readGuestSaves('favorite')).toEqual(['b']);
  });

  it('変更のたびに同一タブの hook へ種類付きのイベントを送る', () => {
    const kinds: unknown[] = [];
    win.addEventListener('techblo:guest-saves-change', (e) => {
      kinds.push((e as CustomEvent).detail);
    });
    toggleGuestSave('bookmark', 'a');
    toggleGuestSave('favorite', 'a');
    expect(kinds).toEqual(['bookmark', 'favorite']);
  });
});

describe('setGuestSave', () => {
  it('状態が変わらないときはイベントを送らない', () => {
    const listener = vi.fn();
    win.addEventListener('techblo:guest-saves-change', listener);
    setGuestSave('bookmark', 'a', false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('旧キーの保存を引き継ぎ、すべて解除しても旧キーから蘇らない', () => {
    win.localStorage.setItem('corpex.guest.bookmarks', JSON.stringify(['old']));
    expect(readGuestSaves('bookmark')).toEqual(['old']);
    setGuestSave('bookmark', 'old', false);
    expect(readGuestSaves('bookmark')).toEqual([]);
    expect(win.localStorage.getItem('corpex.guest.bookmarks')).toBeNull();
  });
});
