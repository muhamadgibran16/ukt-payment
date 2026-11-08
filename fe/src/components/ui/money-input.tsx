import { useRef, type ChangeEvent } from 'react';
import { cn } from '@/lib/cn';
import { fieldClass } from './input';

const MAX_DIGITS = 13;
const formatThousands = (n: number) => n.toLocaleString('id-ID');

interface MoneyInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  onBlur?: () => void;
  id?: string;
  placeholder?: string;
  invalid?: boolean;
}

/** Input nominal rupiah: tampil "4.500.000", nilainya tetap number. */
export function MoneyInput({ value, onChange, onBlur, id, placeholder, invalid }: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const caret = el.selectionStart ?? el.value.length;
    const digitsBeforeCaret = el.value.slice(0, caret).replace(/\D/g, '').length;
    const digits = el.value.replace(/\D/g, '').slice(0, MAX_DIGITS);
    onChange(digits ? Number(digits) : undefined);

    // Setelah diformat ulang, kembalikan kursor ke posisi digit yang sama.
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      let pos = 0;
      for (let seen = 0; pos < input.value.length && seen < digitsBeforeCaret; pos++) {
        if (/\d/.test(input.value[pos])) seen++;
      }
      input.setSelectionRange(pos, pos);
    });
  };

  return (
    <div
      aria-invalid={invalid}
      className={cn(
        fieldClass,
        'flex h-10 items-center overflow-hidden p-0 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100',
      )}
    >
      <span className="flex h-full items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-500">
        Rp
      </span>
      <input
        ref={inputRef}
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={value === undefined ? '' : formatThousands(value)}
        onChange={handleChange}
        onBlur={onBlur}
        aria-invalid={invalid}
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm tabular-nums placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  );
}
