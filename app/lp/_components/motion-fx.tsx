'use client';

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '@/shared/utils';

/**
 * マグネティック・ボタン: カーソルに少し吸い寄せられ、離れるとバネで戻る(motion.dev 風)。
 * transform のみ。タッチ/ reduced-motion / Motion 未動作時は動かず、素の要素として可視のまま(フェイルセーフ)。
 *
 * reduced-motion でも要素は差し替えず、ポインタ入力を無視するだけにする。useReducedMotion は
 * サーバーでは常に false、クライアントの初回描画では matchMedia の実値を返すため、以前のように
 * reduce のとき別の要素(素の div)を返すと、動きを減らす設定の閲覧者だけ hydration mismatch になっていた。
 */
export function Magnetic({
  children,
  className,
  strength = 0.3,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.3 });

  return (
    <motion.div
      className={className}
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType === 'touch') return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 3D ティルト: カーソル位置に応じて奥行きのある傾きを付け、離れるとバネで水平に戻る(motion.dev 風)。
 * transform のみ。タッチ/ reduced-motion / Motion 未動作時は傾かず、素の要素として可視のまま(フェイルセーフ)。
 * reduced-motion で要素を差し替えない理由は Magnetic と同じ(hydration mismatch を避ける)。
 */
export function Tilt({
  children,
  className,
  max = 6,
}: {
  children: ReactNode;
  className?: string;
  /** 最大傾き(度)。 */
  max?: number;
}) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), {
    stiffness: 150,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), {
    stiffness: 150,
    damping: 18,
  });

  return (
    <motion.div
      className={cn('[transform-style:preserve-3d]', className)}
      style={{ rotateX, rotateY, transformPerspective: 1000 }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType === 'touch') return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
    >
      {children}
    </motion.div>
  );
}
