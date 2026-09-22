'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useTransition } from 'react';

const MAIN_ROUTES = ['/', '/bookmarks', '/favorites', '/settings'] as const;
const MIN_SWIPE_DISTANCE = 64;
const INTENT_DISTANCE = 12;
const MAX_VERTICAL_RATIO = 0.65;
const DRAG_RESISTANCE = 0.42;
const EDGE_RESISTANCE = 0.18;
/**
 * 戻る(詳細 → 一覧)は指に 1:1 で追従させる。タブ間の移動は「隣の画面へ滑らせる」操作なので
 * 抵抗を掛けて軽く見せるが、戻るは iOS / X の pop と同じく「掴んだ紙を右へ退かす」操作で、
 * 指と紙がずれると手応えが嘘になる。
 */
const BACK_DRAG_FOLLOW = 1;
/**
 * 戻ったあと、下から現れる一覧が視差でついてくる距離(画面幅比)。
 * タブ移動は左右の画面が横一列に並ぶ世界観なので新ページは全幅(-100%)から入るが、戻るでは
 * 一覧は「詳細の下にずっと在った」ものなので、全幅で飛び込ませると別画面が滑り込んだように見える。
 * 上の紙が抜ける間に少しだけ遅れて定位置へ戻る = 奥行きのある pop に見える。
 */
const BACK_SLIDE_IN_RATIO = 0.28;
const COMMIT_ANIMATION_MS = 180;
/** 戻るの方が移動距離が長く見えるので、少しだけ時間を掛けて減速を効かせる。 */
const BACK_ANIMATION_MS = 260;
/** pop の減速カーブ(iOS の戻るに近い、終わりを長く引く ease-out)。 */
const BACK_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';
const RESET_ANIMATION_MS = 220;
const TRANSITION_EASING = 'cubic-bezier(0.2, 0, 0, 1)';
const MOBILE_QUERY = '(max-width: 1023px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const CONTENT_SELECTOR = '[data-mobile-swipe-content]';
const CONTROL_SELECTOR = ['button', 'input', 'textarea', 'select', '[role="button"]'].join(',');
const BLOCKING_SELECTOR = ['[role="dialog"]', '[data-vaul-drawer]', '[data-swipe-nav-ignore]'].join(
  ',',
);

export type SwipeNavigationInput = {
  pathname: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

type SwipeSession = {
  startX: number;
  startY: number;
  mode: 'pending' | 'horizontal' | 'vertical';
  ignored: boolean;
};

function getRouteIndex(pathname: string): number {
  return MAIN_ROUTES.findIndex((href) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`),
  );
}

/**
 * 記事ページ(/a/[id])。主要4画面の並びに入らない詳細ページなので、横スワイプは
 * 隣のタブへの移動ではなく「戻る」に割り当てる(ADR-0036 でダイアログから
 * ページ遷移に変えたため、シートのスワイプダウンで閉じる操作の代わりが要る)。
 */
function isDetailRoute(pathname: string): boolean {
  return pathname.startsWith('/a/');
}

/** 横スワイプとして成立するか(距離と角度のしきい値)。移動量が足りない/縦寄りなら false。 */
function isHorizontalSwipe({ startX, startY, endX, endY }: SwipeNavigationInput): boolean {
  const horizontalDistance = Math.abs(endX - startX);
  const verticalDistance = Math.abs(endY - startY);
  if (horizontalDistance < MIN_SWIPE_DISTANCE) return false;
  return verticalDistance <= horizontalDistance * MAX_VERTICAL_RATIO;
}

export function getSwipeNavigationHref(input: SwipeNavigationInput): string | null {
  const currentIndex = getRouteIndex(input.pathname);
  if (currentIndex === -1) return null;
  if (!isHorizontalSwipe(input)) return null;

  const nextIndex = input.endX - input.startX > 0 ? currentIndex - 1 : currentIndex + 1;
  return MAIN_ROUTES[nextIndex] ?? null;
}

/**
 * 詳細ページでの右スワイプ(= 戻る)か。左スワイプには何も割り当てない
 * (進む先が無く、記事ページから「次の記事へ」の概念も無いため)。
 */
export function isBackSwipe(input: SwipeNavigationInput): boolean {
  if (!isDetailRoute(input.pathname)) return false;
  if (!isHorizontalSwipe(input)) return false;
  return input.endX - input.startX > 0;
}

export function shouldIgnoreSwipeTarget(tagName: string): boolean {
  return ['button', 'input', 'textarea', 'select'].includes(tagName.toLowerCase());
}

function shouldIgnoreSwipeStart(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest(BLOCKING_SELECTOR)) return true;

  const control = target.closest(CONTROL_SELECTOR);
  if (!control) return false;
  return shouldIgnoreSwipeTarget(control.tagName);
}

function getSwipeContent(): HTMLElement | null {
  return document.querySelector<HTMLElement>(CONTENT_SELECTOR);
}

function setSwipeOffset(
  offset: number,
  animated: boolean,
  motion: { durationMs: number; easing: string } = {
    durationMs: COMMIT_ANIMATION_MS,
    easing: TRANSITION_EASING,
  },
) {
  const content = getSwipeContent();
  if (!content) return;

  content.style.transition = animated
    ? `transform ${motion.durationMs}ms ${motion.easing}`
    : 'none';
  content.style.transform = `translate3d(${Math.round(offset)}px, 0, 0)`;
  content.style.willChange = 'transform';
}

/** inline スタイルを完全にクリアして通常配置(transform なし)へ戻す。 */
function clearSwipeStyles() {
  const content = getSwipeContent();
  if (!content) return;
  content.style.transition = '';
  content.style.transform = '';
  content.style.willChange = '';
}

function resetSwipeOffset(animated: boolean) {
  const content = getSwipeContent();
  if (!content) return;

  if (!animated) {
    clearSwipeStyles();
    return;
  }

  content.style.transition = `transform ${RESET_ANIMATION_MS}ms ${TRANSITION_EASING}`;
  content.style.transform = '';
  content.style.willChange = '';
  window.setTimeout(clearSwipeStyles, RESET_ANIMATION_MS);
}

export function MobileSwipeNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const startRef = useRef<SwipeSession | null>(null);
  const commitTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const slideInTimerRef = useRef<number | null>(null);
  // commit 後のスライドイン待ち。{遷移先, 新コンテンツが入ってくる側(±1), 戻るか}。null=待ち無し。
  // href が null のものは「戻る」で、着地先を事前に確定できないため pathname の変化だけを待つ。
  const pendingSlideInRef = useRef<{
    href: string | null;
    direction: number;
    back: boolean;
    /** 画面幅。commit 時点の値を持ち回す(下の viewportWidthRef のコメント参照)。 */
    width: number;
  } | null>(null);
  /**
   * ジェスチャー開始時に1度だけ測る画面幅。
   * コンテンツを画面外へ translate している間は横方向にオーバーフローするため、モバイルでは
   * レイアウトビューポートが広がり `window.innerWidth` が実際より大きくなる(実測: 390 → 421 →
   * 811 と、読むたびに膨らんだ)。移動距離をその値から計算すると、抜ける距離も入ってくる距離も
   * 狂う。transform を掛ける前の値を掴んでおき、1ジェスチャーの間はそれだけを使う。
   */
  const viewportWidthRef = useRef(0);
  const [, startTransition] = useTransition();

  useEffect(() => {
    for (const href of MAIN_ROUTES) {
      if (href !== pathname) router.prefetch(href);
    }
  }, [pathname, router]);

  // commit したスワイプの「新ページ スライドイン」。遷移先の pathname が確定した時点で発火する。
  // ラッパーは push 前から画面外(direction 側)に居続けるので、古い→新しいコンテンツの差し替えは
  // 画面外で起き、中央へのスナップバック(=ちらつき)が起きない。反対端から中央へ滑り込ませて
  // 「古いページが抜け、新しいページが反対側から入る」連続感を出す。
  // isPending ではなく pathname を見るのは、クライアントキャッシュヒットで遷移が同期的でも
  // pathname は必ず変わり、ラッパーが画面外に取り残される(空白化)のを防げるため。
  useEffect(() => {
    const pending = pendingSlideInRef.current;
    if (!pending) return;
    // 想定外の遷移先(リダイレクト等)に着地したらスタイルを戻して回復する。
    // href=null(戻る)は着地先を問わないのでこの判定を通す。
    if (pending.href !== null && pending.href !== pathname) {
      pendingSlideInRef.current = null;
      clearSwipeStyles();
      return;
    }
    const { direction, back, width } = pending;
    pendingSlideInRef.current = null;

    // タブ移動は左右の画面が横一列に並ぶ世界観なので、新ページは反対端(画面外・全幅)から入る。
    // 戻るは「下に在った一覧が現れる」pop なので、全幅ではなく視差ぶんだけ手前から定位置へ戻す。
    const from = back ? -direction * width * BACK_SLIDE_IN_RATIO : -direction * width;
    const motion = back
      ? { durationMs: BACK_ANIMATION_MS, easing: BACK_EASING }
      : { durationMs: COMMIT_ANIMATION_MS, easing: TRANSITION_EASING };

    // 開始位置へ瞬間移動 → 次フレームで中央へアニメ(瞬間移動を確実に描画させてから滑らせる)。
    setSwipeOffset(from, false);
    rafRef.current = window.requestAnimationFrame(() => {
      setSwipeOffset(0, true, motion);
      slideInTimerRef.current = window.setTimeout(clearSwipeStyles, motion.durationMs);
    });

    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      if (slideInTimerRef.current) window.clearTimeout(slideInTimerRef.current);
    };
  }, [pathname]);

  useEffect(() => {
    const isMobile = () => window.matchMedia(MOBILE_QUERY).matches;

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch || event.touches.length !== 1 || !isMobile()) {
        startRef.current = null;
        return;
      }

      // transform を掛ける前に画面幅を確定させる(オーバーフローで膨らむ前の値)。
      viewportWidthRef.current = window.innerWidth;
      startRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        mode: 'pending',
        ignored: shouldIgnoreSwipeStart(event.target),
      };
    };

    const onTouchMove = (event: TouchEvent) => {
      const start = startRef.current;
      const touch = event.touches[0];
      if (!start || start.ignored || !touch || !isMobile()) return;

      const deltaX = touch.clientX - start.startX;
      const deltaY = touch.clientY - start.startY;
      const horizontalDistance = Math.abs(deltaX);
      const verticalDistance = Math.abs(deltaY);

      if (start.mode === 'pending' && horizontalDistance > INTENT_DISTANCE) {
        start.mode =
          verticalDistance > horizontalDistance * MAX_VERTICAL_RATIO ? 'vertical' : 'horizontal';
      }
      if (start.mode !== 'horizontal') return;

      const input = {
        pathname,
        startX: start.startX,
        startY: start.startY,
        endX: touch.clientX,
        endY: touch.clientY,
      };
      // 指を追従させる量で「離せば遷移する」かを予告する(行き先が無い方向は重くする)。
      // 詳細ページの右方向は最初から 1:1 で追従させる。しきい値(64px)を越えてから追従量を
      // 上げると紙が指に追いつく段差が出るし、iOS / X の pop は最初のピクセルから指に貼り付く。
      const follow = isDetailRoute(pathname)
        ? deltaX > 0
          ? BACK_DRAG_FOLLOW
          : EDGE_RESISTANCE
        : getSwipeNavigationHref(input) !== null
          ? DRAG_RESISTANCE
          : EDGE_RESISTANCE;

      event.preventDefault();
      setSwipeOffset(deltaX * follow, false);
    };

    const onTouchEnd = (event: TouchEvent) => {
      const start = startRef.current;
      startRef.current = null;
      const touch = event.changedTouches[0];
      if (!start || start.ignored || !touch || !isMobile()) return;

      const input = {
        pathname,
        startX: start.startX,
        startY: start.startY,
        endX: touch.clientX,
        endY: touch.clientY,
      };
      const href = getSwipeNavigationHref(input);
      const back = isBackSwipe(input);
      if ((!href || href === pathname) && !back) {
        resetSwipeOffset(true);
        return;
      }

      // 戻るは履歴を1つ巻き戻す(一覧はルーターキャッシュから復帰し、スクロール位置も
      // ブラウザが復元する)。共有リンクで直接開いて履歴が無い場合だけフィードへ push する
      // (ArticleBackLink と同じ規則)。
      const navigate = () => {
        if (!back) {
          router.push(href as string);
          return;
        }
        if (window.history.length > 1) router.back();
        else router.push('/');
      };

      // 動きを抑えたいユーザーにはアニメーションを出さず即遷移する。
      if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
        clearSwipeStyles();
        startTransition(navigate);
        return;
      }

      // 古いコンテンツを画面外(direction 側)へ滑らせ、抜けきってから遷移する。
      // 遷移後のスライドインは {href, direction} を arm し、pathname 確定後に effect 側で発火する。
      // 戻るは着地先が履歴次第で事前に確定できないため href=null(= どこへ着いても発火)にする。
      const direction = touch.clientX > start.startX ? 1 : -1;
      // 戻るは指の位置から画面外までの残りを滑らせるので、距離に見合う時間と減速カーブにする。
      const motion = back
        ? { durationMs: BACK_ANIMATION_MS, easing: BACK_EASING }
        : { durationMs: COMMIT_ANIMATION_MS, easing: TRANSITION_EASING };
      const width = viewportWidthRef.current || window.innerWidth;
      setSwipeOffset(direction * width, true, motion);
      commitTimerRef.current = window.setTimeout(() => {
        pendingSlideInRef.current = {
          href: back ? null : (href as string),
          direction,
          back,
          width,
        };
        startTransition(navigate);
      }, motion.durationMs);
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      // この effect は pathname 変更(=遷移 commit)ごとに再実行される。ここで transform を消すと
      // commit 後のスライドインの直前に新コンテンツが中央へ一瞬出てちらつくため、消去はしない。
      // スタイルは onTouchEnd 系(cancel/reduced-motion/slide-in effect)が必ず後始末する。
      // mid-drag/mid-animation のまま unmount された時だけ下の unmount effect が掃除する。
    };
  }, [pathname, router, startTransition]);

  // unmount 時のみ、走行中のタイマー/rAF と残った inline スタイルを掃除する。
  useEffect(() => {
    return () => {
      if (commitTimerRef.current) window.clearTimeout(commitTimerRef.current);
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      if (slideInTimerRef.current) window.clearTimeout(slideInTimerRef.current);
      clearSwipeStyles();
    };
  }, []);

  return null;
}
