import posthog from 'posthog-js';

/**
 * PostHog(プロダクト分析)のクライアント側ラッパー。イベント一覧と命名規約は
 * docs/architecture/observability.md §4。
 *
 * キー未設定(ローカル・プレビュー等)では init しないので、以降の capture / identify / reset は
 * すべて no-op になる。呼び出し側はキーの有無を気にせず呼んでよい。
 *
 * features を import しない(lib → features は逆流。ADR-0010)。イベントの型はここで閉じて定義し、
 * 各 feature の web 層 / components から captureEvent を呼ぶ。
 */

const DEFAULT_HOST = 'https://us.i.posthog.com';

/** lib/auth.ts の socialProviders と一致させること(features/auth の SocialProvider と同値)。 */
export type AnalyticsAuthProvider = 'google' | 'github' | 'discord';

/** 記事ページへのリンクが置かれた場所。どの導線から読まれているかの内訳に使う。 */
export type ArticleClickSource = 'feed' | 'event_list' | 'related';

type ArticleRef = {
  articleId: string;
  companyId: string;
  /** PostHog 上で人が読める内訳にするため id と併せて送る。 */
  companySlug: string;
};

type SaveChange = { articleId: string; isGuest: boolean };

/** companyId はゲスト(Cookie は slug だけを持つ)では null。bulk は「すべて表示/非表示」による変更。 */
type SubscriptionChange = {
  companyId: string | null;
  companySlug: string;
  isGuest: boolean;
  bulk: boolean;
};

/**
 * 送信できるイベントとプロパティ。メール・名前などの個人情報は載せない(ユーザーの特定は
 * identify の userId のみ。docs/architecture/observability.md §3)。
 */
export type AnalyticsEvents = {
  article_clicked: ArticleRef & { source: ArticleClickSource };
  article_source_opened: ArticleRef;
  login_clicked: { provider: AnalyticsAuthProvider };
  login_succeeded: { provider: AnalyticsAuthProvider; isNewUser: boolean };
  bookmark_added: SaveChange;
  bookmark_removed: SaveChange;
  favorite_added: SaveChange;
  favorite_removed: SaveChange;
  subscription_added: SubscriptionChange;
  subscription_removed: SubscriptionChange;
};

export type AnalyticsEventName = keyof AnalyticsEvents;

let initialized = false;

/**
 * 1回だけ init する。key が空なら何もしない(no-op のまま)。
 *
 * - pageview: App Router のクライアント遷移は history.pushState で URL を変えるだけなので、
 *   既定の「ページロード時のみ」では取れない。'history_change' で遷移ごとに $pageview を送る。
 * - autocapture / セッション録画は切る。autocapture はクリック要素のテキスト($el_text)を送るため、
 *   ユーザーメニュー等に出るメールアドレスがプロパティに載りうる。録画も画面上のメールを写す。
 *   計測は明示イベント(AnalyticsEvents)だけにする。
 * - person_profiles: 'identified_only' で匿名訪問者には person を作らない(再訪は distinct_id で追える)。
 */
export function initPostHog({ key, host }: { key: string | undefined; host: string | undefined }) {
  if (initialized || !key || typeof window === 'undefined') return;
  posthog.init(key, {
    api_host: host ?? DEFAULT_HOST,
    capture_pageview: 'history_change',
    capture_pageleave: 'if_capture_pageview',
    autocapture: false,
    rageclick: false,
    capture_dead_clicks: false,
    disable_session_recording: true,
    person_profiles: 'identified_only',
  });
  initialized = true;
}

export function captureEvent<E extends AnalyticsEventName>(
  event: E,
  properties: AnalyticsEvents[E],
) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

/** ログイン中のユーザーに紐づける。userId 以外(メール・名前)は person プロパティにも送らない。 */
export function identifyUser(userId: string) {
  if (!initialized || posthog.get_distinct_id() === userId) return;
  posthog.identify(userId);
}

/** ログアウト時に匿名 id へ戻す。識別済みでなければ何もしない(ゲストの匿名 id を毎回作り直さない)。 */
export function resetUser() {
  if (!initialized || posthog.get_property('$user_state') !== 'identified') return;
  posthog.reset();
}
