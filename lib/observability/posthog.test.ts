import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const posthogMock = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  get_distinct_id: vi.fn(() => 'anon-id'),
  get_property: vi.fn((): unknown => 'anonymous'),
}));

vi.mock('posthog-js', () => ({ default: posthogMock }));

// initialized はモジュール内状態なので、テストごとに読み込み直す。
async function load() {
  vi.resetModules();
  return import('./posthog');
}

beforeEach(() => {
  vi.stubGlobal('window', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('posthog(キー未設定)', () => {
  it('init せず、capture / identify / reset はすべて no-op', async () => {
    const { initPostHog, captureEvent, identifyUser, resetUser } = await load();
    initPostHog({ key: undefined, host: undefined });
    captureEvent('login_clicked', { provider: 'google' });
    identifyUser('user-1');
    resetUser();
    expect(posthogMock.init).not.toHaveBeenCalled();
    expect(posthogMock.capture).not.toHaveBeenCalled();
    expect(posthogMock.identify).not.toHaveBeenCalled();
    expect(posthogMock.reset).not.toHaveBeenCalled();
  });

  it('サーバー(window なし)では init しない', async () => {
    vi.unstubAllGlobals();
    const { initPostHog } = await load();
    initPostHog({ key: 'phc_test', host: undefined });
    expect(posthogMock.init).not.toHaveBeenCalled();
  });
});

describe('posthog(キー設定済み)', () => {
  it('1回だけ init し、App Router の遷移も pageview として送り、autocapture は切る', async () => {
    const { initPostHog } = await load();
    initPostHog({ key: 'phc_test', host: 'https://eu.i.posthog.com' });
    initPostHog({ key: 'phc_test', host: 'https://eu.i.posthog.com' });
    expect(posthogMock.init).toHaveBeenCalledTimes(1);
    expect(posthogMock.init).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        api_host: 'https://eu.i.posthog.com',
        capture_pageview: 'history_change',
        autocapture: false,
        disable_session_recording: true,
      }),
    );
  });

  it('capture はイベント名とプロパティをそのまま渡す', async () => {
    const { initPostHog, captureEvent } = await load();
    initPostHog({ key: 'phc_test', host: undefined });
    captureEvent('bookmark_added', { articleId: 'a1', isGuest: false });
    expect(posthogMock.capture).toHaveBeenCalledWith('bookmark_added', {
      articleId: 'a1',
      isGuest: false,
    });
  });

  it('identify は userId だけを渡し、同じ id なら呼び直さない', async () => {
    const { initPostHog, identifyUser } = await load();
    initPostHog({ key: 'phc_test', host: undefined });
    identifyUser('user-1');
    expect(posthogMock.identify).toHaveBeenCalledWith('user-1');

    posthogMock.get_distinct_id.mockReturnValueOnce('user-1');
    identifyUser('user-1');
    expect(posthogMock.identify).toHaveBeenCalledTimes(1);
  });

  it('reset は識別済みのときだけ呼ぶ(ゲストの匿名 id を作り直さない)', async () => {
    const { initPostHog, resetUser } = await load();
    initPostHog({ key: 'phc_test', host: undefined });
    resetUser();
    expect(posthogMock.reset).not.toHaveBeenCalled();

    posthogMock.get_property.mockReturnValueOnce('identified');
    resetUser();
    expect(posthogMock.reset).toHaveBeenCalledTimes(1);
  });
});
