import { useId, useRef } from 'react';
import { cn } from '@/lib/cn';
import { useClickOutside } from '@/lib/use-click-outside';
import { useListbox } from '@/lib/use-listbox';
import { ChevronDownIcon, SearchIcon } from './icons';
import { fieldClass } from './input';
import { ListboxOption, listboxPanelClass, type Option } from './listbox-option';
import { Spinner } from './spinner';

export interface ComboboxProps {
  /** Opsi yang sedang dipilih (disimpan pemanggil agar tetap tampil walau hasil pencarian berubah). */
  selected: Option | null;
  onSelect: (option: Option) => void;
  options: Option[];
  search: string;
  onSearchChange: (search: string) => void;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  id?: string;
  invalid?: boolean;
}

/** Dropdown dengan kotak pencarian, untuk daftar opsi yang panjang / dari server. */
export function Combobox({
  selected,
  onSelect,
  options,
  search,
  onSearchChange,
  loading = false,
  placeholder = 'Pilih…',
  searchPlaceholder = 'Cari…',
  emptyText = 'Tidak ada hasil',
  id,
  invalid,
}: ComboboxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  const { isOpen, activeIndex, setActiveIndex, close, toggle, select, onKeyDown } = useListbox({
    count: options.length,
    selectedIndex: options.findIndex((o) => o.value === selected?.value),
    onSelect: (index) => onSelect(options[index]),
    listRef,
    onDismiss: () => triggerRef.current?.focus(),
  });
  useClickOutside(rootRef, close, isOpen);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-invalid={invalid}
        onClick={toggle}
        onKeyDown={onKeyDown}
        className={cn(
          fieldClass,
          'flex h-10 items-center justify-between gap-2 text-left',
          isOpen && 'border-brand-600 ring-2 ring-brand-100',
        )}
      >
        <span className={cn('truncate', !selected && 'text-slate-400')}>
          {selected ? (
            <>
              {selected.label}
              {selected.description && (
                <span className="ml-2 text-slate-500">{selected.description}</span>
              )}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDownIcon
          className={cn(
            'size-4 shrink-0 text-slate-400 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {isOpen && (
        <div className={listboxPanelClass}>
          <div className="relative border-b border-slate-100 p-2">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-4.5 size-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="text"
              role="combobox"
              aria-controls={listboxId}
              aria-expanded
              aria-activedescendant={options.length ? `${listboxId}-${activeIndex}` : undefined}
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onKeyDown}
              className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pr-8 pl-8 text-sm placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:outline-none"
            />
            {loading && (
              <Spinner className="absolute top-1/2 right-4.5 size-4 -translate-y-1/2 text-slate-400" />
            )}
          </div>
          <ul ref={listRef} id={listboxId} role="listbox" className="max-h-64 overflow-y-auto p-1">
            {options.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-500">
                {loading ? 'Memuat…' : emptyText}
              </li>
            ) : (
              options.map((option, index) => (
                <ListboxOption
                  key={option.value}
                  id={`${listboxId}-${index}`}
                  index={index}
                  option={option}
                  selected={option.value === selected?.value}
                  active={index === activeIndex}
                  onHover={setActiveIndex}
                  onSelect={select}
                />
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
