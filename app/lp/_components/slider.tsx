'use client';

import useEmblaCarousel from 'embla-carousel-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/shared/utils';

export type SlideItem = { key: string; content: ReactNode };

/**
 * LP 用カルーセル(Embla)。タッチ/マウスドラッグ + 慣性 + スナップを自然に扱う。
 * ドットで現在位置を示し、クリックで該当スライドへスムーズ移動。
 * モバイル/タブレットの縦長圧縮用。デスクトップは親側で別レイアウトに切替える。
 */
export function Slider({
  items,
  slideClassName,
  ariaLabel,
  align = 'stretch',
}: {
  items: SlideItem[];
  /** 各スライドの幅(例: 'w-[86%] sm:w-[56%]')。次のカードを覗かせる。 */
  slideClassName?: string;
  ariaLabel?: string;
  /**
   * スライドの縦整列。'stretch' は全スライドを最大高に揃える(等高カード向け)、
   * 'start' は各スライドを自然な高さで上揃え(テキスト+図版の組み向け。中間の空き隙間を作らない)。
   */
  align?: 'stretch' | 'start';
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    // スナップ位置は中央。containScroll:false で先頭/末尾スライドも中央に来る。
    align: 'center',
    containScroll: false,
    dragFree: false,
    skipSnaps: false,
  });
  const [selected, setSelected] = useState(0);
  const [snaps, setSnaps] = useState<number[]>([]);

  useEffect(() => {
    if (!emblaApi) return;
    const sync = () => {
      setSnaps(emblaApi.scrollSnapList());
      setSelected(emblaApi.selectedScrollSnap());
    };
    sync();
    emblaApi.on('select', sync).on('reInit', sync);
    return () => {
      emblaApi.off('select', sync).off('reInit', sync);
    };
  }, [emblaApi]);

  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  return (
    <section aria-roledescription="carousel" aria-label={ariaLabel}>
      {/* viewport。overflow-hidden で外にはみ出さず、ドラッグは Embla が司る。 */}
      <div className="overflow-hidden" ref={emblaRef}>
        {/* container。touch-pan-y で縦スクロールは妨げない。両端に px-6 の呼吸を与える。 */}
        <div
          className={cn(
            'flex touch-pan-y gap-4 px-6',
            align === 'stretch' ? 'items-stretch' : 'items-start',
          )}
        >
          {items.map((item) => (
            <div key={item.key} className={cn('min-w-0 shrink-0', slideClassName)}>
              {item.content}
            </div>
          ))}
        </div>
      </div>

      {/* ドット(現在位置 + ジャンプ)。 */}
      <div className="mt-5 flex items-center justify-center gap-2">
        {snaps.map((_, i) => (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: ドットはスナップ位置の固定列で並べ替えが無い
            key={i}
            type="button"
            aria-label={`${i + 1} 枚目へ`}
            aria-current={i === selected}
            onClick={() => scrollTo(i)}
            className={cn(
              'h-1.5 rounded-full transition-all duration-200',
              i === selected ? 'w-5 bg-accent' : 'w-1.5 bg-border-strong hover:bg-fg-faint',
            )}
          />
        ))}
      </div>
    </section>
  );
}
