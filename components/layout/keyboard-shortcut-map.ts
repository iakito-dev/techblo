/** `g` に続けて押すキーの受付時間。これを過ぎたら単独の `g` として捨てる。 */
export const SEQUENCE_TIMEOUT_MS = 1000;

export type ShortcutAction =
  | { type: 'move'; delta: 1 | -1 }
  | { type: 'open-external' }
  | { type: 'toggle-bookmark' }
  | { type: 'toggle-favorite' }
  | { type: 'focus-search' }
  | { type: 'toggle-help' }
  | { type: 'navigate'; href: string }
  | { type: 'scroll-top' };

const GO_TARGETS: Record<string, string> = {
  h: '/',
  b: '/bookmarks',
  f: '/favorites',
  s: '/settings',
};

const SINGLE_KEY_ACTIONS: Record<string, ShortcutAction> = {
  j: { type: 'move', delta: 1 },
  k: { type: 'move', delta: -1 },
  o: { type: 'open-external' },
  b: { type: 'toggle-bookmark' },
  f: { type: 'toggle-favorite' },
  '/': { type: 'focus-search' },
  '?': { type: 'toggle-help' },
};

export type KeyEventLike = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  isComposing: boolean;
  target: { tagName?: string; isContentEditable?: boolean } | null;
};

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * 入力中・IME 変換中・修飾キー付きでは発火させない。
 * 文字入力を奪うと検索や IME 確定が壊れ、⌘+キー等のブラウザ標準操作とも衝突するため。
 */
export function shouldIgnoreKeyEvent(event: KeyEventLike): boolean {
  if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return true;
  const target = event.target;
  if (!target) return false;
  if (target.isContentEditable) return true;
  return target.tagName != null && EDITABLE_TAGS.has(target.tagName.toUpperCase());
}

export type ResolveResult = {
  action: ShortcutAction | null;
  /** 次回に持ち越す `g` 押下時刻。シーケンス待ちでなければ null。 */
  pendingSince: number | null;
};

/**
 * キー1打を「アクション」と「次の待ち状態」に解決する純粋関数。
 * 待ち時間切れの `g` 後のキーは単独キーとして扱い、取りこぼしを避ける。
 */
export function resolveShortcut(input: {
  key: string;
  pendingSince: number | null;
  now: number;
}): ResolveResult {
  const { key, pendingSince, now } = input;
  if (pendingSince != null && now - pendingSince <= SEQUENCE_TIMEOUT_MS) {
    const href = GO_TARGETS[key];
    if (href) return { action: { type: 'navigate', href }, pendingSince: null };
    if (key === 't') return { action: { type: 'scroll-top' }, pendingSince: null };
  }
  if (key === 'g') return { action: null, pendingSince: now };
  return { action: SINGLE_KEY_ACTIONS[key] ?? null, pendingSince: null };
}

/** j/k の移動先インデックス。未選択(-1)からは先頭、端では止まる。 */
export function nextIndex(current: number, count: number, delta: 1 | -1): number {
  if (count <= 0) return -1;
  if (current < 0) return 0;
  return Math.min(count - 1, Math.max(0, current + delta));
}

/** 外部 URL として新規タブで開いてよいか。想定外のスキーム(javascript: 等)を弾く。 */
export function isSafeExternalUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

export type ShortcutGroup = {
  title: string;
  items: { keys: string[]; label: string; sequence?: boolean }[];
};

/** ダイアログ表示用。実際の割り当て(上の定義)と食い違わないようここに並べる。 */
export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: '記事',
    items: [
      { keys: ['j'], label: '次の記事へ移動' },
      { keys: ['k'], label: '前の記事へ移動' },
      { keys: ['Enter'], label: '記事ページを開く' },
      { keys: ['o'], label: '元記事を新規タブで開く' },
      { keys: ['b'], label: 'あとで読むを切り替え' },
      { keys: ['f'], label: 'お気に入りを切り替え' },
    ],
  },
  {
    title: '移動',
    items: [
      { keys: ['g', 'h'], label: 'フィードへ', sequence: true },
      { keys: ['g', 'b'], label: 'あとで読むへ', sequence: true },
      { keys: ['g', 'f'], label: 'お気に入りへ', sequence: true },
      { keys: ['g', 's'], label: '設定へ', sequence: true },
      { keys: ['g', 't'], label: 'ページの先頭へ', sequence: true },
    ],
  },
  {
    title: '全般',
    items: [
      { keys: ['/'], label: '検索ボックスにフォーカス' },
      { keys: ['?'], label: 'ショートカット一覧を開閉' },
      { keys: ['Esc'], label: '閉じる' },
    ],
  },
];
