import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * shadcn/ui の Tailwind クラス結合ヘルパー。
 * クラスの優先順位を正しくマージする。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
