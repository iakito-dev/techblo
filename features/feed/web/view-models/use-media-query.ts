'use client';

import { useEffect, useState } from 'react';

/**
 * `matchMedia` を購読する小フック。
 * マウント前(SSR/初回)は false を返し、ハイドレーション不一致を避ける。
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
