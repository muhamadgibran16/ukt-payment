import { useId, useRef } from 'react';
import { cn } from '@/lib/cn';
import { useClickOutside } from '@/lib/use-click-outside';
import { useListbox } from '@/lib/use-listbox';
import { ChevronDownIcon } from './icons';
import { fieldClass } from './input';
import { ListboxOption, listboxPanelClass, type Option } from './listbox-option';

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  /** Arah popover; 'top' untuk dropdown di bagian bawah halaman (mis. pagination). */
  placement?: 'bottom' | 'top';
  'aria-label'?: string;
}

/** Dropdown pilih-satu (pengganti <select> bawaan browser), pola ARIA "select-only combobox". */
export function Select({
  value,
  onChange,
  options,
  placeholder = 'Pilih…',
  id,
  invalid,
  disabled,
  className,
  placement = 'bottom',
  'aria-label': ariaLabel,
}: SelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();
  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex];

  const { isOpen, activeIndex, setActiveIndex, close, toggle, select, onKeyDown } = useListbox({
    count: options.length,
    selectedIndex,
    onSelect: (index) => onChange(options[index].value),
    listRef,
  });
  useClickOutside(rootRef, close, isOpen);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={isOpen ? `${listboxId}-${activeIndex}` : undefined}
        aria-invalid={invalid}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={onKeyDown}
        className={cn(
          fieldClass,
          'flex h-10 items-center justify-between gap-2 text-left',
          isOpen && 'border-brand-600 ring-2 ring-brand-100',
        )}
      >
        <span className={cn('truncate', !selected && 'text-slate-400')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDownIcon
          className={cn(
            'size-4 shrink-0 text-slate-400 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className={cn(
            listboxPanelClass,
            'max-h-64 overflow-y-auto p-1',
            placement === 'top' && 'bottom-full mt-0 mb-1.5',
          )}
        >
          {options.map((option, index) => (
            <ListboxOption
              key={option.value}
              id={`${listboxId}-${index}`}
              index={index}
              option={option}
              selected={index === selectedIndex}
              active={index === activeIndex}
              onHover={setActiveIndex}
              onSelect={select}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
