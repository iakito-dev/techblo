import { describe, expect, test } from 'vitest';
import {
  isSafeExternalUrl,
  type KeyEventLike,
  nextIndex,
  resolveShortcut,
  SEQUENCE_TIMEOUT_MS,
  shouldIgnoreKeyEvent,
} from './keyboard-shortcut-map';

const base: KeyEventLike = {
  key: 'j',
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  isComposing: false,
  target: { tagName: 'BODY' },
};

describe('shouldIgnoreKeyEvent', () => {
  test('通常のキーは無視しない', () => {
    expect(shouldIgnoreKeyEvent(base)).toBe(false);
    expect(shouldIgnoreKeyEvent({ ...base, target: null })).toBe(false);
  });

  test('入力要素と contenteditable では無視する', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT']) {
      expect(shouldIgnoreKeyEvent({ ...base, target: { tagName } })).toBe(true);
    }
    expect(
      shouldIgnoreKeyEvent({ ...base, target: { tagName: 'DIV', isContentEditable: true } }),
    ).toBe(true);
  });

  test('IME 変換中と修飾キー付きは無視する', () => {
    expect(shouldIgnoreKeyEvent({ ...base, isComposing: true })).toBe(true);
    expect(shouldIgnoreKeyEvent({ ...base, metaKey: true })).toBe(true);
    expect(shouldIgnoreKeyEvent({ ...base, ctrlKey: true })).toBe(true);
    expect(shouldIgnoreKeyEvent({ ...base, altKey: true })).toBe(true);
  });
});

describe('resolveShortcut', () => {
  const none = { pendingSince: null, now: 1000 };

  test('単独キーをアクションへ解決する', () => {
    expect(resolveShortcut({ key: 'j', ...none }).action).toEqual({ type: 'move', delta: 1 });
    expect(resolveShortcut({ key: 'k', ...none }).action).toEqual({ type: 'move', delta: -1 });
    expect(resolveShortcut({ key: 'o', ...none }).action).toEqual({ type: 'open-external' });
    expect(resolveShortcut({ key: 'b', ...none }).action).toEqual({ type: 'toggle-bookmark' });
    expect(resolveShortcut({ key: 'f', ...none }).action).toEqual({ type: 'toggle-favorite' });
    expect(resolveShortcut({ key: '/', ...none }).action).toEqual({ type: 'focus-search' });
    expect(resolveShortcut({ key: '?', ...none }).action).toEqual({ type: 'toggle-help' });
    expect(resolveShortcut({ key: 'x', ...none }).action).toBeNull();
  });

  test('g は待ち状態に入りアクションを返さない', () => {
    expect(resolveShortcut({ key: 'g', ...none })).toEqual({ action: null, pendingSince: 1000 });
  });

  test('g の後の2打鍵目で遷移し、待ち状態を解除する', () => {
    const cases = { h: '/', b: '/bookmarks', f: '/favorites', r: '/history', s: '/settings' };
    for (const [key, href] of Object.entries(cases)) {
      expect(resolveShortcut({ key, pendingSince: 1000, now: 1500 })).toEqual({
        action: { type: 'navigate', href },
        pendingSince: null,
      });
    }
  });

  test('g の後の t でページ先頭へのスクロールに解決する', () => {
    expect(resolveShortcut({ key: 't', pendingSince: 1000, now: 1500 })).toEqual({
      action: { type: 'scroll-top' },
      pendingSince: null,
    });
    expect(resolveShortcut({ key: 't', ...none }).action).toBeNull();
  });

  test('時間切れ後は b を単独のブックマークとして扱う', () => {
    const result = resolveShortcut({
      key: 'b',
      pendingSince: 1000,
      now: 1000 + SEQUENCE_TIMEOUT_MS + 1,
    });
    expect(result.action).toEqual({ type: 'toggle-bookmark' });
  });

  test('g の後に遷移対象外のキーが来たら単独キーとして扱う', () => {
    expect(resolveShortcut({ key: 'j', pendingSince: 1000, now: 1200 })).toEqual({
      action: { type: 'move', delta: 1 },
      pendingSince: null,
    });
  });
});

describe('nextIndex', () => {
  test('未選択からは先頭へ', () => {
    expect(nextIndex(-1, 5, 1)).toBe(0);
    expect(nextIndex(-1, 5, -1)).toBe(0);
  });

  test('端では止まる', () => {
    expect(nextIndex(4, 5, 1)).toBe(4);
    expect(nextIndex(0, 5, -1)).toBe(0);
    expect(nextIndex(2, 5, 1)).toBe(3);
  });

  test('要素が無ければ -1', () => {
    expect(nextIndex(0, 0, 1)).toBe(-1);
  });
});

describe('isSafeExternalUrl', () => {
  test('http(s) のみ許可する', () => {
    expect(isSafeExternalUrl('https://example.com/a')).toBe(true);
    expect(isSafeExternalUrl('http://example.com')).toBe(true);
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeExternalUrl('not a url')).toBe(false);
    expect(isSafeExternalUrl(undefined)).toBe(false);
  });
});
