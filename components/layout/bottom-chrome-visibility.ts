const TOP_VISIBLE_THRESHOLD = 96;
const SCROLL_JITTER_THRESHOLD = 6;

export type BottomChromeVisibilityInput = {
  currentY: number;
  lastY: number;
  hidden: boolean;
};

export function getNextBottomChromeHidden({
  currentY,
  lastY,
  hidden,
}: BottomChromeVisibilityInput): boolean {
  const delta = currentY - lastY;

  if (currentY < TOP_VISIBLE_THRESHOLD) return false;
  if (delta > SCROLL_JITTER_THRESHOLD) return true;
  if (delta < -SCROLL_JITTER_THRESHOLD) return false;
  return hidden;
}
