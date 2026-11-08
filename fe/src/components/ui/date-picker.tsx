import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import {
  addDays,
  addMonths,
  calendarDays,
  formatLongDate,
  formatMonthYear,
  formatShortDate,
  isSameDay,
  isSameMonth,
  parseISODate,
  toISODate,
  WEEKDAY_LABELS,
} from '@/lib/date';
import { useClickOutside } from '@/lib/use-click-outside';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';
import { fieldClass } from './input';

const CALENDAR_HEIGHT = 360;

/** Buka ke atas jika ruang di bawah pemicu tidak cukup dan ruang di atas lebih lega. */
function preferredPlacement(trigger: HTMLElement | null): 'bottom' | 'top' {
  if (!trigger) return 'bottom';
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  return spaceBelow < CALENDAR_HEIGHT && rect.top > spaceBelow ? 'top' : 'bottom';
}

export interface DatePickerProps {
  /** Tanggal terpilih, format "YYYY-MM-DD" (string kosong = belum dipilih). */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Tanggal paling awal yang boleh dipilih, "YYYY-MM-DD". */
  min?: string;
  /** Tanggal "hari ini" menurut aplikasi (mis. WIB), "YYYY-MM-DD". */
  today?: string;
  id?: string;
  placeholder?: string;
  invalid?: boolean;
}

export function DatePicker({
  value,
  onChange,
  onBlur,
  min,
  today,
  id,
  placeholder = 'Pilih tanggal',
  invalid,
}: DatePickerProps) {
  const selected = parseISODate(value);
  const minDate = parseISODate(min);
  const todayDate = parseISODate(today) ?? new Date();

  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const [focused, setFocused] = useState<Date>(selected ?? minDate ?? todayDate);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const isDisabled = (d: Date) => !!minDate && toISODate(d) < toISODate(minDate);

  const openCalendar = () => {
    setFocused(selected ?? (minDate && minDate > todayDate ? minDate : todayDate));
    setPlacement(preferredPlacement(triggerRef.current));
    setOpen(true);
  };
  const close = (refocus = false) => {
    setOpen(false);
    onBlur?.();
    if (refocus) triggerRef.current?.focus();
  };
  const choose = (d: Date) => {
    if (isDisabled(d)) return;
    onChange(toISODate(d));
    close(true);
  };
  useClickOutside(rootRef, () => close(), open);

  // Roving focus: tombol tanggal yang "focused" selalu memegang fokus keyboard.
  useEffect(() => {
    if (!open) return;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${toISODate(focused)}"]`)
      ?.focus();
  }, [focused, open]);

  const onGridKeyDown = (e: KeyboardEvent) => {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      Home: () => addDays(focused, -((focused.getDay() + 6) % 7)),
      End: () => addDays(focused, 6 - ((focused.getDay() + 6) % 7)),
      PageUp: () => addMonths(focused, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, e.shiftKey ? 12 : 1),
    };
    if (moves[e.key]) {
      e.preventDefault();
      setFocused(moves[e.key]());
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(focused);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    }
  };

  const canGoPrev =
    !minDate || addMonths(focused, -1) >= new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const goToMonth = (delta: number) => {
    const next = addMonths(focused, delta);
    setFocused(minDate && next < minDate ? minDate : next);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid}
        aria-label={selected ? `Tanggal: ${formatLongDate(selected)}` : placeholder}
        onClick={() => (open ? close() : openCalendar())}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            openCalendar();
          }
        }}
        className={cn(
          fieldClass,
          'flex h-10 items-center justify-between gap-2 text-left',
          open && 'border-brand-600 ring-2 ring-brand-100',
        )}
      >
        <span className={cn('truncate', !selected && 'text-slate-400')}>
          {selected ? formatShortDate(selected) : placeholder}
        </span>
        <CalendarIcon className="size-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Pilih tanggal"
          className={cn(
            'absolute z-30 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg shadow-slate-900/10',
            placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Bulan sebelumnya"
              disabled={!canGoPrev}
              onClick={() => goToMonth(-1)}
              className="flex size-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <p className="text-sm font-semibold text-slate-900 capitalize" aria-live="polite">
              {formatMonthYear(focused)}
            </p>
            <button
              type="button"
              aria-label="Bulan berikutnya"
              onClick={() => goToMonth(1)}
              className="flex size-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
            >
              <ChevronRightIcon className="size-4" />
            </button>
          </div>

          <div ref={gridRef} role="grid" onKeyDown={onGridKeyDown}>
            <div role="row" className="mb-1 grid grid-cols-7">
              {WEEKDAY_LABELS.map((day) => (
                <span
                  key={day}
                  role="columnheader"
                  className="py-1 text-center text-xs font-medium text-slate-400"
                >
                  {day}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-0.5">
              {calendarDays(focused).map((day) => {
                const iso = toISODate(day);
                const isSelected = isSameDay(day, selected);
                const isFocused = isSameDay(day, focused);
                const disabled = isDisabled(day);
                return (
                  <button
                    key={iso}
                    type="button"
                    role="gridcell"
                    data-date={iso}
                    tabIndex={isFocused ? 0 : -1}
                    disabled={disabled}
                    aria-selected={isSelected}
                    aria-label={formatLongDate(day)}
                    aria-current={isSameDay(day, todayDate) ? 'date' : undefined}
                    onClick={() => choose(day)}
                    className={cn(
                      'mx-auto flex size-9 items-center justify-center rounded-md text-sm transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                      isSameMonth(day, focused) ? 'text-slate-800' : 'text-slate-300',
                      !isSelected && !disabled && 'hover:bg-slate-100',
                      isSameDay(day, todayDate) &&
                        !isSelected &&
                        'font-semibold text-brand-700 ring-1 ring-brand-200',
                      isSelected && 'bg-brand-700 font-semibold text-white',
                      disabled &&
                        'cursor-not-allowed text-slate-300 line-through decoration-slate-300',
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {selected && (
            <div className="mt-2 flex justify-end border-t border-slate-100 pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  close(true);
                }}
                className="rounded px-1.5 py-0.5 font-medium text-slate-600 hover:bg-slate-100"
              >
                Hapus
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
