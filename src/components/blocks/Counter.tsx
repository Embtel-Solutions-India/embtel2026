'use client';

import { useEffect, useRef, useState } from 'react';

const DURATION = 2000;

// Server HTML carries the final value (crawlers, no-JS, reduced motion). With JS, it counts up
// from 0 the first time it scrolls into view.
export function Counter({ value }: { value: string }) {
  const target = Number(value.replace(/,/g, ''));
  const countable = Number.isFinite(target) && /^[\d,]+$/.test(value);
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!countable || !el || !('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION);
        setShown(Math.round(target * (1 - (1 - t) ** 3)).toLocaleString('en-US'));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [countable, target]);

  return <span ref={ref}>{shown}</span>;
}
