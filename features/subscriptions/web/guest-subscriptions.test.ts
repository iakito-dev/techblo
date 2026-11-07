import { describe, expect, it } from 'vitest';
import {
  GUEST_UNSUBSCRIBED_COOKIE,
  GUEST_UNSUBSCRIBED_COOKIE_LEGACY,
  parseUnsubscribed,
  readUnsubscribedFrom,
  serializeUnsubscribed,
} from './guest-subscriptions';

describe('parseUnsubscribed', () => {
  it('未設定・空文字は空配列', () => {
    expect(parseUnsubscribed(undefined)).toEqual([]);
    expect(parseUnsubscribed('')).toEqual([]);
  });

  it('壊れた Cookie 値は空配列(例外を投げない)', () => {
    expect(parseUnsubscribed('not-json')).toEqual([]);
    expect(parseUnsubscribed('%E0%A4%A')).toEqual([]);
  });

  it('配列以外の JSON は空配列、文字列以外の要素は除く', () => {
    expect(parseUnsubscribed(encodeURIComponent('{"a":1}'))).toEqual([]);
    expect(parseUnsubscribed(encodeURIComponent('["a",1,null,"b"]'))).toEqual(['a', 'b']);
  });
});

describe('serializeUnsubscribed', () => {
  it('parseUnsubscribed と往復しても同じ slug 配列に戻る', () => {
    const slugs = ['zozo', 'mercari', 'ドメイン'];
    expect(parseUnsubscribed(serializeUnsubscribed(slugs))).toEqual(slugs);
  });
});

describe('readUnsubscribedFrom', () => {
  const enc = serializeUnsubscribed;

  it('新キーがあれば新キーを優先する', () => {
    const jar: Record<string, string> = {
      [GUEST_UNSUBSCRIBED_COOKIE]: enc(['new']),
      [GUEST_UNSUBSCRIBED_COOKIE_LEGACY]: enc(['old']),
    };
    expect(readUnsubscribedFrom((n) => jar[n])).toEqual(['new']);
  });

  it('新キーが無ければ旧キーにフォールバックする', () => {
    const jar: Record<string, string> = { [GUEST_UNSUBSCRIBED_COOKIE_LEGACY]: enc(['old']) };
    expect(readUnsubscribedFrom((n) => jar[n])).toEqual(['old']);
  });

  it('どちらも無ければ空配列', () => {
    expect(readUnsubscribedFrom(() => undefined)).toEqual([]);
  });
});
