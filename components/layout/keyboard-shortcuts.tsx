'use client';

import { Modal } from '@heroui/react';
import { useRouter } from 'next/navigation';
import {
  createContext,
  Fragment,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  isSafeExternalUrl,
  nextIndex,
  resolveShortcut,
  SHORTCUT_GROUPS,
  type ShortcutAction,
  shouldIgnoreKeyEvent,
} from './keyboard-shortcut-map';

type KeyboardShortcutsContextValue = {
  openHelp: () => void;
};

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

/** サイドバーなど、ダイアログを開くだけの呼び出し側向け。Provider 外では no-op。 */
export function useKeyboardShortcutsHelp(): KeyboardShortcutsContextValue {
  return useContext(KeyboardShortcutsContext) ?? { openHelp: () => {} };
}

const CARD_SELECTOR = '[data-article-card]';
const MAIN_SELECTOR = '[data-article-main]';
const LINK_SELECTOR = 'a[data-article-link]';

/** CSS で隠れているカード(トップの棚は一部を display:none にする)へはフォーカスさせない。 */
function visibleArticleLinks(): HTMLAnchorElement[] {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>(LINK_SELECTOR)).filter(
    (el) => el.offsetParent !== null,
  );
}

/** フォーカス中の要素が属するカード。無ければ記事ページの主記事を対象にする。 */
function currentArticleScope(): HTMLElement | null {
  const active = document.activeElement;
  const card = active instanceof HTMLElement ? active.closest<HTMLElement>(CARD_SELECTOR) : null;
  return card ?? document.querySelector<HTMLElement>(MAIN_SELECTOR);
}

function moveFocus(delta: 1 | -1) {
  const links = visibleArticleLinks();
  const active = document.activeElement;
  const card = active instanceof HTMLElement ? active.closest<HTMLElement>(CARD_SELECTOR) : null;
  const current = card ? links.findIndex((el) => card.contains(el)) : -1;
  const target = links[nextIndex(current, links.length, delta)];
  if (!target) return;
  // 画面外へ飛ぶと focus() の自動スクロールが中央寄せになり目が追えないので、最小限の移動に揃える。
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'nearest' });
}

function clickAction(name: 'bookmark' | 'favorite') {
  const button = currentArticleScope()?.querySelector<HTMLButtonElement>(
    `[data-shortcut-action="${name}"]`,
  );
  button?.click();
}

function openExternal() {
  const url = currentArticleScope()?.dataset.articleUrl;
  if (!isSafeExternalUrl(url)) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function focusSearch(): boolean {
  const input = Array.from(document.querySelectorAll<HTMLInputElement>('[data-feed-search]')).find(
    (el) => el.offsetParent !== null,
  );
  if (!input) return false;
  input.focus();
  input.select();
  return true;
}

/**
 * グローバルなキーボードショートカットと一覧ダイアログ(?)を提供する。
 * 入力中・IME 変換中・修飾キー付きは奪わない(keyboard-shortcut-map.ts)。
 */
export function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const helpOpenRef = useRef(false);
  const pendingSinceRef = useRef<number | null>(null);

  useEffect(() => {
    helpOpenRef.current = helpOpen;
  }, [helpOpen]);

  useEffect(() => {
    function run(action: ShortcutAction, event: KeyboardEvent) {
      switch (action.type) {
        case 'move':
          event.preventDefault();
          moveFocus(action.delta);
          return;
        case 'open-external':
          openExternal();
          return;
        case 'toggle-bookmark':
          clickAction('bookmark');
          return;
        case 'toggle-favorite':
          clickAction('favorite');
          return;
        case 'focus-search':
          // 入力欄へ "/" が打ち込まれないよう、フォーカスできたときだけ既定動作を止める。
          if (focusSearch()) event.preventDefault();
          return;
        case 'toggle-help':
          event.preventDefault();
          setHelpOpen((v) => !v);
          return;
        case 'navigate':
          event.preventDefault();
          router.push(action.href);
          return;
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      // KeyboardEvent のプロパティはプロトタイプ上の getter なのでスプレッドでは写せない。
      const ignored = shouldIgnoreKeyEvent({
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        isComposing: event.isComposing,
        target,
      });
      if (ignored) return;
      // ダイアログ表示中は背面の記事を操作させない(? による閉じるだけ許可)。
      if (helpOpenRef.current && event.key !== '?') return;
      const { action, pendingSince } = resolveShortcut({
        key: event.key,
        pendingSince: pendingSinceRef.current,
        now: Date.now(),
      });
      pendingSinceRef.current = pendingSince;
      if (action) run(action, event);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const value = useMemo(() => ({ openHelp: () => setHelpOpen(true) }), []);

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
      <ShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </KeyboardShortcutsContext.Provider>
  );
}

function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Modal isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="border border-border-default bg-bg-surface text-fg-default">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>キーボードショートカット</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-5">
                {SHORTCUT_GROUPS.map((group) => (
                  <section key={group.title}>
                    <h3 className="mb-2 font-medium text-fg-subtle text-xs">{group.title}</h3>
                    <dl className="flex flex-col">
                      {group.items.map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between gap-4 border-border-default border-t py-2 text-sm first:border-t-0"
                        >
                          <dt className="text-fg-default">{item.label}</dt>
                          <dd className="flex shrink-0 items-center gap-1 text-fg-muted">
                            {item.keys.map((key, i) => (
                              <Fragment key={key}>
                                {i > 0 && (
                                  <span aria-hidden="true" className="text-fg-subtle text-xs">
                                    →
                                  </span>
                                )}
                                <Kbd>{key}</Kbd>
                              </Fragment>
                            ))}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded-sm border border-border-default bg-bg-surface-2 px-1.5 py-0.5 font-mono text-fg-default text-xs">
      {children}
    </kbd>
  );
}
