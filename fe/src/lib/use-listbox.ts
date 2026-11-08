import { useEffect, useState, type KeyboardEvent, type RefObject } from 'react';

interface UseListboxOptions {
  count: number;
  /** Index opsi terpilih; jadi opsi aktif saat daftar dibuka. */
  selectedIndex: number;
  onSelect: (index: number) => void;
  listRef: RefObject<HTMLElement | null>;
  /** Dipanggil saat daftar ditutup lewat keyboard/pilihan (mis. untuk mengembalikan fokus). */
  onDismiss?: () => void;
}

/**
 * State & navigasi keyboard untuk dropdown (listbox): buka/tutup, panah, Home/End,
 * Enter, Escape. Fokus tetap di pemicu/input; opsi aktif ditandai lewat aria-activedescendant.
 */
export function useListbox({
  count,
  selectedIndex,
  onSelect,
  listRef,
  onDismiss,
}: UseListboxOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen, listRef]);

  const open = () => {
    setActiveIndex(Math.max(0, selectedIndex));
    setIsOpen(true);
  };
  const close = () => setIsOpen(false);
  const dismiss = () => {
    close();
    onDismiss?.();
  };
  const toggle = () => (isOpen ? close() : open());
  const select = (index: number) => {
    onSelect(index);
    dismiss();
  };

  const clamp = (i: number) => Math.max(0, Math.min(count - 1, i));

  const onKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        open();
      }
      return;
    }
    if (e.key === 'Tab') return close();

    const actions: Record<string, () => void> = {
      ArrowDown: () => setActiveIndex((i) => clamp(i + 1)),
      ArrowUp: () => setActiveIndex((i) => clamp(i - 1)),
      Home: () => setActiveIndex(0),
      End: () => setActiveIndex(count - 1),
      Enter: () => count > 0 && select(activeIndex),
      Escape: dismiss,
    };
    if (actions[e.key]) {
      e.preventDefault();
      actions[e.key]();
    }
  };

  return { isOpen, activeIndex, setActiveIndex, open, close, toggle, select, onKeyDown };
}
