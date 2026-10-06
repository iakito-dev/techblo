'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getNextBottomChromeHidden } from './bottom-chrome-visibility';

type BottomChromeContextValue = {
  hidden: boolean;
  setKeepVisible: (keepVisible: boolean) => void;
};

const BottomChromeContext = createContext<BottomChromeContextValue | null>(null);

export function BottomChromeProvider({ children }: { children: ReactNode }) {
  const [hiddenRaw, setHiddenRaw] = useState(false);
  const [keepVisible, setKeepVisible] = useState(false);
  const hiddenRef = useRef(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const next = getNextBottomChromeHidden({
        currentY: window.scrollY,
        lastY,
        hidden: hiddenRef.current,
      });
      hiddenRef.current = next;
      setHiddenRaw(next);
      lastY = window.scrollY;
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const setKeepVisibleStable = useCallback((next: boolean) => {
    setKeepVisible(next);
  }, []);

  const value = useMemo<BottomChromeContextValue>(
    () => ({
      hidden: hiddenRaw && !keepVisible,
      setKeepVisible: setKeepVisibleStable,
    }),
    [hiddenRaw, keepVisible, setKeepVisibleStable],
  );

  return <BottomChromeContext.Provider value={value}>{children}</BottomChromeContext.Provider>;
}

/** Provider 外(公開ページ)でも使える版。下部ナビが無い画面では null。 */
export function useOptionalBottomChrome(): BottomChromeContextValue | null {
  return useContext(BottomChromeContext);
}

export function useBottomChrome(): BottomChromeContextValue {
  const value = useContext(BottomChromeContext);
  if (!value) {
    throw new Error('useBottomChrome must be used within BottomChromeProvider');
  }
  return value;
}
