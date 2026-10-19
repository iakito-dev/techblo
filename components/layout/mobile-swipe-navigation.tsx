'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useTransition } from 'react';

const MAIN_ROUTES = ['/', '/bookmarks', '/favorites', '/settings'] as const;
const INTENT_DISTANCE = 12;
const MAX_VERTICAL_RATIO = 0.65;
const EDGE_RESISTANCE = 0.18;
/**
 * 行き先がある方向(隣のタブ / 戻る)へのドラッグは指に 1:1 で追従させる。
 * 以前はタブ移動だけ 0.42 倍の抵抗を掛けていたが、指と画面がずれると「掴んでいる」感覚が無く、
 * さらに 64px を越えた瞬間に追従量が 0.18 → 0.42 倍へ跳ねて画面がガクッと動いていた。
 * iOS のページ送り / X のタブ移動と同じく、最初のピクセルから指に貼り付ける。
 */
const DRAG_FOLLOW = 1;
/** ゆっくり引いた時に遷移を確定させる距離(画面幅比)。3割引けば「めくる」意思とみなす。 */
const COMMIT_DISTANCE_RATIO = 0.3;
/** 素早く払った(フリック)とみなす速度(px/ms)。これ以上なら短い距離でも遷移する。 */
const FLICK_VELOCITY = 0.35;
/** フリックでも、これ未満の移動はタップのぶれとして遷移させない。 */
const FLICK_MIN_DISTANCE = 32;
/** 指を戻しながら離した(逆向きの速度がこれ以上)なら、距離が足りていても取り消す。 */
const CANCEL_VELOCITY = 0.2;
/** 速度を測る直近の時間窓(ms)。離す直前の動きだけを見る。 */
const VELOCITY_WINDOW_MS = 100;
/**
 * 戻ったあと、下から現れる一覧が視差でついてくる距離(画面幅比)。
 * タブ移動は左右の画面が横一列に並ぶ世界観なので新ページは全幅(-100%)から入るが、戻るでは
 * 一覧は「詳細の下にずっと在った」ものなので、全幅で飛び込ませると別画面が滑り込んだように見える。
 * 上の紙が抜ける間に少しだけ遅れて定位置へ戻る = 奥行きのある pop に見える。
 */
const BACK_SLIDE_IN_RATIO = 0.28;
const COMMIT_ANIMATION_MS = 180;
/**
 * 指を離した位置から画面外まで滑らせる時間の範囲。残り距離に比例させる
 * (たくさん引いてから離したのに、毎回同じ時間を掛けて抜けると間延びして見える)。
 */
const MIN_EXIT_MS = 110;
const MAX_EXIT_MS = 240;
/** 戻るの方が移動距離が長く見えるので、少しだけ時間を掛けて減速を効かせる。 */
const BACK_ANIMATION_MS = 260;
/** pop の減速カーブ(iOS の戻るに近い、終わりを長く引く ease-out)。 */
const BACK_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';
const RESET_ANIMATION_MS = 220;
const TRANSITION_EASING = 'cubic-bezier(0.2, 0, 0, 1)';
/**
 * 画面の左右端から始まった指は OS / ブラウザの「戻る・進む」ジェスチャー(iOS Safari・ホーム画面の
 * Web アプリの端スワイプ、Android のジェスチャーナビ)の領域として、アプリ側では扱わない。
 * ブラウザは前ページのスナップショットごと画面全体を動かすので、アプリも本文を動かすと
 * 本文だけが二重にずれて見える(ヘッダーと本文が離れ、前ページの一覧が左にのぞく)。
 * touchcancel はブラウザがジェスチャーを確定してからしか来ず、それまでの touchmove で
 * 本文はもう動いてしまうため、開始位置で弾く。
 */
const BROWSER_EDGE_GESTURE_PX = 24;
const MOBILE_QUERY = '(max-width: 1023px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const CONTENT_SELECTOR = '[data-mobile-swipe-content]';
const CONTROL_SELECTOR = ['button', 'input', 'textarea', 'select', '[role="button"]'].join(',');
const BLOCKING_SELECTOR = ['[role="dialog"]', '[data-vaul-drawer]', '[data-swipe-nav-ignore]'].join(
  ',',
);

type SwipeSession = {
  startX: number;
  startY: number;
  mode: 'pending' | 'horizontal' | 'vertical';
  ignored: boolean;
  /** 速度計算用の直近の位置(時刻つき)。VELOCITY_WINDOW_MS より古いものは捨てる。 */
  samples: { x: number; t: number }[];
  /** 行き先の本文を先読み済みか(1ジェスチャーで1回だけ)。 */
  prefetched: boolean;
  /** 指に追従させた現在の translate 量。離した位置から画面外までの残り距離の計算に使う。 */
  offset: number;
};

/** 直近の位置から横速度(px/ms)を求める。点が足りなければ 0。 */
function velocityFromSamples(samples: { x: number; t: number }[]): number {
  if (samples.length < 2) return 0;
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last) return 0;
  const dt = last.t - first.t;
  return dt > 0 ? (last.x - first.x) / dt : 0;
}

/**
 * 隣のタブを本文まで先読みする(router.prefetch の full)。既定の先読みは動的ルートの枠
 * (loading の skeleton)までなので、ドラッグ中に本文の取得を始めておき、抜けた直後に中身が出るようにする。
 * App Router の prefetch は kind に enum(PrefetchKind)を取るが公開 export が無いため、値で渡す。
 */
const FULL_PREFETCH = { kind: 'full' } as unknown as Parameters<
  ReturnType<typeof useRouter>['prefetch']
>[1];

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

/** 指の開始位置がブラウザの端スワイプ(戻る・進む)の領域か。 */
export function isBrowserEdgeGesture(startX: number, viewportWidth: number): boolean {
  return startX <= BROWSER_EDGE_GESTURE_PX || startX >= viewportWidth - BROWSER_EDGE_GESTURE_PX;
}

/**
 * その方向へ行き先があるか(距離は問わない)。主要4画面は隣のタブ、記事ページは右(= 戻る)だけ。
 * ドラッグ中の追従量もこれで決める。以前のように距離しきい値込みで判定すると、しきい値を越えた
 * 瞬間に追従量が変わって画面が跳ねるため、方向だけで決める。
 */
export function hasSwipeDestination(pathname: string, deltaX: number): boolean {
  if (deltaX === 0) return false;
  if (isDetailRoute(pathname)) return deltaX > 0;
  const currentIndex = getRouteIndex(pathname);
  if (currentIndex === -1) return false;
  const nextIndex = deltaX > 0 ? currentIndex - 1 : currentIndex + 1;
  return MAIN_ROUTES[nextIndex] !== undefined;
}

/**
 * 指を離した時に遷移を確定するか。iOS のページ送りと同じく「十分引いた」か「素早く払った」で決め、
 * 指を戻しながら離したら取り消す。velocityX は離す直前の横速度(px/ms、右が正)。
 */
export function shouldCommitSwipe({
  deltaX,
  velocityX,
  viewportWidth,
}: {
  deltaX: number;
  velocityX: number;
  viewportWidth: number;
}): boolean {
  const direction = Math.sign(deltaX);
  if (direction === 0) return false;
  const distance = Math.abs(deltaX);
  const forwardVelocity = velocityX * direction;
  if (forwardVelocity <= -CANCEL_VELOCITY) return false;
  if (distance >= viewportWidth * COMMIT_DISTANCE_RATIO) return true;
  return distance >= FLICK_MIN_DISTANCE && forwardVelocity >= FLICK_VELOCITY;
}

/** 画面外へ抜けるまでの時間。残り距離に比例させ、上下限で丸める。 */
export function exitDurationMs(remaining: number, viewportWidth: number): number {
  if (viewportWidth <= 0) return MAX_EXIT_MS;
  const ratio = Math.min(Math.max(remaining / viewportWidth, 0), 1);
  return Math.round(MIN_EXIT_MS + (MAX_EXIT_MS - MIN_EXIT_MS) * ratio);
}

export function shouldIgnoreSwipeTarget(tagName: string): boolean {
  return ['button', 'input', 'textarea', 'select'].includes(tagName.toLowerCase());
}

/**
 * 横スクロールできる要素か(overflow-x が auto/scroll で、中身が幅からはみ出している)。
 * はみ出していない(= 実際には横に動かない)要素は対象外にし、スワイプ遷移を妨げない。
 */
export function isHorizontalScroller({
  overflowX,
  scrollWidth,
  clientWidth,
}: {
  overflowX: string;
  scrollWidth: number;
  clientWidth: number;
}): boolean {
  return (overflowX === 'auto' || overflowX === 'scroll') && scrollWidth > clientWidth + 1;
}

/**
 * 指を置いた位置から祖先を辿り、横スクロール領域(適用中フィルタのチップ行など)の
 * 中かを調べる。その中で始まった横スワイプは「隠れたタブを見る」操作なので、タブ間遷移に
 * 奪ってはいけない(奪うと touchmove の preventDefault でスクロール自体も止まり、画面外の
 * カテゴリに一生届かない上、隣の画面へ飛ばされる)。
 */
function isInsideHorizontalScroller(target: Element): boolean {
  for (let el: Element | null = target; el && el !== document.body; el = el.parentElement) {
    const { overflowX } = window.getComputedStyle(el);
    if (
      isHorizontalScroller({
        overflowX,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      })
    ) {
      return true;
    }
  }
  return false;
}

function shouldIgnoreSwipeStart(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest(BLOCKING_SELECTOR)) return true;
  if (isInsideHorizontalScroller(target)) return true;

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
        samples: [{ x: touch.clientX, t: event.timeStamp }],
        prefetched: false,
        offset: 0,
        ignored:
          isBrowserEdgeGesture(touch.clientX, viewportWidthRef.current) ||
          shouldIgnoreSwipeStart(event.target),
      };
    };

    const onTouchMove = (event: TouchEvent) => {
      const start = startRef.current;
      const touch = event.touches[0];
      if (!start || start.ignored || !touch || !isMobile()) return;

      const deltaX = touch.clientX - start.startX;
      const deltaY = touch.clientY - start.startY;
      start.samples.push({ x: touch.clientX, t: event.timeStamp });
      while (
        start.samples.length > 2 &&
        event.timeStamp - (start.samples[0]?.t ?? 0) > VELOCITY_WINDOW_MS
      ) {
        start.samples.shift();
      }
      const horizontalDistance = Math.abs(deltaX);
      const verticalDistance = Math.abs(deltaY);

      if (start.mode === 'pending' && horizontalDistance > INTENT_DISTANCE) {
        start.mode =
          verticalDistance > horizontalDistance * MAX_VERTICAL_RATIO ? 'vertical' : 'horizontal';
      }
      if (start.mode !== 'horizontal') return;

      // 行き先がある方向は指に 1:1、無い方向(端のタブ・記事ページの左)は重くして「行けない」と伝える。
      const hasDestination = hasSwipeDestination(pathname, deltaX);
      const follow = hasDestination ? DRAG_FOLLOW : EDGE_RESISTANCE;

      // 隣のタブへ引き始めたら、離す前から本文の取得を始める(戻るは履歴から復帰するので不要)。
      if (hasDestination && !start.prefetched && !isDetailRoute(pathname)) {
        const nextIndex = getRouteIndex(pathname) + (deltaX > 0 ? -1 : 1);
        const nextHref = MAIN_ROUTES[nextIndex];
        if (nextHref) {
          start.prefetched = true;
          router.prefetch(nextHref, FULL_PREFETCH);
        }
      }

      event.preventDefault();
      start.offset = deltaX * follow;
      setSwipeOffset(start.offset, false);
    };

    const onTouchEnd = (event: TouchEvent) => {
      const start = startRef.current;
      startRef.current = null;
      const touch = event.changedTouches[0];
      if (!start || start.ignored || !touch || !isMobile()) return;

      // 縦スクロールとして始まった/横に動いていない指は、遷移もリセットもしない(何も動かしていない)。
      if (start.mode !== 'horizontal') return;

      const deltaX = touch.clientX - start.startX;
      const width = viewportWidthRef.current || window.innerWidth;
      const commit =
        hasSwipeDestination(pathname, deltaX) &&
        shouldCommitSwipe({
          deltaX,
          velocityX: velocityFromSamples(start.samples),
          viewportWidth: width,
        });
      const back = commit && isDetailRoute(pathname);
      const href =
        commit && !back ? MAIN_ROUTES[getRouteIndex(pathname) + (deltaX > 0 ? -1 : 1)] : null;
      if (!back && (!href || href === pathname)) {
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
      const direction = deltaX > 0 ? 1 : -1;
      // 指の位置から画面外までの残りを滑らせるので、残り距離に見合う時間にする
      // (たくさん引いてから離したら短く、フリックで少しだけ動かした時は長め)。戻るは pop の減速カーブ。
      const exitMs = exitDurationMs(width - Math.abs(start.offset), width);
      const motion = back
        ? { durationMs: exitMs, easing: BACK_EASING }
        : { durationMs: exitMs, easing: TRANSITION_EASING };
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

    // touchcancel は指を離した操作ではない(iOS Safari の端スワイプ = ブラウザ自身の戻る が
    // ジェスチャーを奪った時などに来る)。ここで遷移を確定すると、ブラウザの戻ると二重に
    // 遷移してしまうので、引っ張った分を元に戻すだけにする。
    const onTouchCancel = () => {
      const start = startRef.current;
      startRef.current = null;
      if (start && !start.ignored) resetSwipeOffset(true);
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchCancel, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
      // この effect は pathname 変更(=遷移 commit)ごとに再実行される。ここで transform を消すと
      // commit 後のスライドインの直前に新コンテンツが中央へ一瞬出てちらつくため、消去はしない。
      // スタイルは onTouchEnd 系(cancel/reduced-motion/slide-in effect)が必ず後始末する。
      // mid-drag/mid-animation のまま unmount された時だけ下の unmount effect が掃除する。
    };
  }, [pathname, router]);

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
