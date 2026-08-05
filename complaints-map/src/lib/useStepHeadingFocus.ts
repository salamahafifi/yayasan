import { useEffect, useRef, type RefObject } from 'react';

/** Focus the step heading when the step mounts / changes. */
export function useStepHeadingFocus<T extends HTMLElement = HTMLElement>(
  step: number,
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const id = window.requestAnimationFrame(() => {
      // Programmatic focus should not use :focus-visible ring (mouse path).
      el.focus({ preventScroll: false });
    });
    return () => window.cancelAnimationFrame(id);
  }, [step]);

  return ref;
}
