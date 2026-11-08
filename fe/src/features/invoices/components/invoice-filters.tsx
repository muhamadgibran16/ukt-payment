import { Select } from '@/components/ui/select';
import { SearchInput } from '@/components/ui/search-input';
import { cn } from '@/lib/cn';
import { semesterOptions } from '@/lib/format';
import { INVOICE_STATUS } from '../constants';
import type { InvoiceFilters as Filters } from '../hooks/use-invoice-filters';
import type { InvoiceStatus } from '../types';

type FilterValues = Omit<Filters, 'page' | 'limit'>;

interface InvoiceFiltersProps extends FilterValues {
  onChange: (changes: Partial<FilterValues>) => void;
}

const SEMESTER_FILTER_OPTIONS = [{ value: '', label: 'Semua semester' }, ...semesterOptions()];

const STATUS_TABS: { value?: InvoiceStatus; label: string }[] = [
  { value: undefined, label: 'Semua' },
  ...(Object.keys(INVOICE_STATUS) as InvoiceStatus[]).map((value) => ({
    value,
    label: INVOICE_STATUS[value].label,
  })),
];

export function InvoiceFilters({ status, semester, search, onChange }: InvoiceFiltersProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
      <StatusTabs value={status} onChange={(next) => onChange({ status: next })} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          aria-label="Filter semester"
          value={semester ?? ''}
          onChange={(value) => onChange({ semester: value || undefined })}
          options={SEMESTER_FILTER_OPTIONS}
          className="sm:w-60"
        />
        <SearchInput
          value={search}
          onSearch={(term) => onChange({ search: term })}
          placeholder="Cari nomor tagihan, nama, NIM…"
          aria-label="Cari tagihan"
          className="sm:w-72"
        />
      </div>
    </div>
  );
}

function StatusTabs({
  value,
  onChange,
}: {
  value?: InvoiceStatus;
  onChange: (status: InvoiceStatus | undefined) => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1"
      role="tablist"
      aria-label="Filter status"
    >
      {STATUS_TABS.map((tab) => (
        <button
          key={tab.label}
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === tab.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
