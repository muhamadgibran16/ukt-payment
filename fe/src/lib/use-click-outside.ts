import { useEffect, useEffectEvent, type RefObject } from 'react';

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  enabled = true,
) {
  const onOutside = useEffectEvent((event: PointerEvent) => {
    if (ref.current && !ref.current.contains(event.target as Node)) handler();
  });

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener('pointerdown', onOutside);
    return () => document.removeEventListener('pointerdown', onOutside);
  }, [enabled]);
}
