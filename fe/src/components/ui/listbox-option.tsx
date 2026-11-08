import { cn } from '@/lib/cn';
import { CheckIcon } from './icons';

export interface Option {
  value: string;
  label: string;
  description?: string;
}

interface ListboxOptionProps {
  id: string;
  index: number;
  option: Option;
  selected: boolean;
  active: boolean;
  onHover: (index: number) => void;
  onSelect: (index: number) => void;
}

export function ListboxOption({
  id,
  index,
  option,
  selected,
  active,
  onHover,
  onSelect,
}: ListboxOptionProps) {
  return (
    <li
      id={id}
      role="option"
      data-index={index}
      aria-selected={selected}
      onMouseMove={() => onHover(index)}
      // mousedown agar fokus tidak berpindah sebelum pilihan diterapkan
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect(index);
      }}
      className={cn(
        'flex cursor-pointer items-start gap-2 rounded-md px-2.5 py-2 text-sm',
        active && 'bg-slate-100',
        selected && 'bg-brand-50',
      )}
    >
      <CheckIcon
        className={cn('mt-0.5 size-4 shrink-0 text-brand-700', !selected && 'invisible')}
      />
      <span className="min-w-0">
        <span
          className={cn(
            'block truncate',
            selected ? 'font-medium text-brand-800' : 'text-slate-800',
          )}
        >
          {option.label}
        </span>
        {option.description && (
          <span className="block text-xs text-slate-500">{option.description}</span>
        )}
      </span>
    </li>
  );
}

export const listboxPanelClass =
  'absolute z-30 mt-1.5 w-full min-w-max overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg shadow-slate-900/10';
