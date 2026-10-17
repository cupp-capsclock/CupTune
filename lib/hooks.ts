'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useInView(rootMargin = '300px'): [(el: Element | null) => void, boolean] {
  const [seen, setSeen] = useState(false);
  const obs = useRef<IntersectionObserver | null>(null);
  const ref = useCallback(
    (el: Element | null) => {
      obs.current?.disconnect();
      if (!el || seen) return;
      if (typeof IntersectionObserver === 'undefined') {
        setSeen(true);
        return;
      }
      obs.current = new IntersectionObserver(
        (es) => {
          if (es.some((e) => e.isIntersecting)) {
            setSeen(true);
            obs.current?.disconnect();
          }
        },
        { rootMargin },
      );
      obs.current.observe(el);
    },
    [rootMargin, seen],
  );
  return [ref, seen];
}

export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
