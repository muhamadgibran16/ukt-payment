import { useEffect, useEffectEvent, useState, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { useDebounce } from '@/lib/use-debounce';
import { SearchIcon, XIcon } from './icons';
import { fieldClass } from './input';

interface SearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> {
  value?: string;
  /** Dipanggil setelah pengguna berhenti mengetik (debounce), atau langsung saat dikosongkan. */
  onSearch: (term: string | undefined) => void;
  delay?: number;
}

export function SearchInput({
  value,
  onSearch,
  delay = 300,
  className,
  ...props
}: SearchInputProps) {
  const [term, setTerm] = useState(value ?? '');
  const debounced = useDebounce(term.trim(), delay);

  const notify = useEffectEvent((next: string) => {
    if (next !== (value ?? '')) onSearch(next || undefined);
  });
  useEffect(() => notify(debounced), [debounced]);

  const clear = () => {
    setTerm('');
    onSearch(undefined);
  };

  return (
    <div className={cn('relative', className)}>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        role="searchbox"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && term && clear()}
        className={cn(fieldClass, 'h-10 pr-9 pl-9')}
        {...props}
      />
      {term && (
        <button
          type="button"
          onClick={clear}
          aria-label="Hapus pencarian"
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  );
}
