import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { Option } from '@/components/ui/listbox-option';
import { MoneyInput } from '@/components/ui/money-input';
import { Select } from '@/components/ui/select';
import type { User } from '@/features/auth/types';
import { useStudents } from '@/features/students/api/student-api';
import { getErrorMessage } from '@/lib/api-client';
import { addDays, parseISODate, toISODate } from '@/lib/date';
import { semesterOptions } from '@/lib/format';
import { endOfDayInAppTimezone, timezoneLabel, todayInAppTimezone } from '@/lib/timezone';
import { useDebounce } from '@/lib/use-debounce';
import { useCreateInvoice } from '../api/invoice-api';
import type { Invoice } from '../types';

const schema = z.object({
  studentId: z.string().min(1, 'Pilih mahasiswa'),
  semester: z.string().regex(/^\d{4}[12]$/, 'Pilih semester'),
  invoiceNumber: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === '' || /^[A-Z0-9][A-Z0-9-]{2,49}$/.test(v), {
      message: 'Hanya huruf, angka, dan tanda hubung (3–50 karakter)',
    }),
  amount: z
    .number({ error: 'Nominal wajib diisi' })
    .int('Nominal harus bilangan bulat')
    .min(1, 'Nominal minimal Rp1')
    .max(1_000_000_000, 'Nominal terlalu besar'),
  expiresDate: z
    .string()
    .min(1, 'Tanggal kedaluwarsa wajib diisi')
    .refine((v) => v > todayInAppTimezone(), 'Harus setelah hari ini'),
});
type FormValues = z.infer<typeof schema>;

/** Batas bayar paling cepat besok (hari ini sudah tidak valid menurut schema). */
const tomorrowInAppTimezone = () => toISODate(addDays(parseISODate(todayInAppTimezone())!, 1));

const toStudentOption = (s: User): Option => ({
  value: s.id,
  label: s.name,
  description: `NIM ${s.nim}`,
});

interface CreateInvoiceFormProps {
  onCreated: (invoice: Invoice) => void;
  onCancel?: () => void;
}

export function CreateInvoiceForm({ onCreated, onCancel }: CreateInvoiceFormProps) {
  const [studentSearch, setStudentSearch] = useState('');
  const [pickedStudent, setPickedStudent] = useState<User | null>(null);
  const students = useStudents(useDebounce(studentSearch));
  const createInvoice = useCreateInvoice();
  const semesters = semesterOptions();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      studentId: '',
      semester: semesters[2]?.value ?? '',
      invoiceNumber: '',
      expiresDate: '',
    },
  });
  const semester = useWatch({ control, name: 'semester' });

  const onSubmit = handleSubmit((values) => {
    createInvoice.mutate(
      {
        studentId: values.studentId,
        semester: values.semester,
        invoiceNumber: values.invoiceNumber || undefined,
        amount: values.amount,
        expiresAt: endOfDayInAppTimezone(values.expiresDate),
      },
      { onSuccess: onCreated },
    );
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {createInvoice.isError && (
        <Alert title="Gagal membuat tagihan">{getErrorMessage(createInvoice.error)}</Alert>
      )}

      <Field label="Mahasiswa" htmlFor="studentId" error={errors.studentId?.message}>
        <Controller
          name="studentId"
          control={control}
          render={({ field }) => (
            <Combobox
              id="studentId"
              selected={pickedStudent && toStudentOption(pickedStudent)}
              onSelect={(option) => {
                setPickedStudent(students.data?.items.find((s) => s.id === option.value) ?? null);
                field.onChange(option.value);
              }}
              options={students.data?.items.map(toStudentOption) ?? []}
              search={studentSearch}
              onSearchChange={setStudentSearch}
              loading={students.isFetching}
              placeholder="Pilih mahasiswa"
              searchPlaceholder="Cari nama atau NIM…"
              emptyText="Mahasiswa tidak ditemukan"
              invalid={!!errors.studentId}
            />
          )}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Semester" htmlFor="semester" error={errors.semester?.message}>
          <Controller
            name="semester"
            control={control}
            render={({ field }) => (
              <Select
                id="semester"
                value={field.value}
                onChange={field.onChange}
                options={semesters}
                invalid={!!errors.semester}
              />
            )}
          />
        </Field>

        <Field
          label="Nomor tagihan (opsional)"
          htmlFor="invoiceNumber"
          error={errors.invoiceNumber?.message}
          hint={
            pickedStudent && semester
              ? `Kosongkan untuk otomatis: UKT-${semester}-${pickedStudent.nim}`
              : 'Kosongkan untuk dibuat otomatis.'
          }
        >
          <Input
            id="invoiceNumber"
            placeholder="UKT-20261-2023001"
            className="font-mono uppercase placeholder:normal-case"
            aria-invalid={!!errors.invoiceNumber}
            {...register('invoiceNumber')}
          />
        </Field>

        <Field label="Nominal UKT" htmlFor="amount" error={errors.amount?.message}>
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <MoneyInput
                id="amount"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="4.500.000"
                invalid={!!errors.amount}
              />
            )}
          />
        </Field>

        <Field
          label="Tanggal kedaluwarsa"
          htmlFor="expiresDate"
          error={errors.expiresDate?.message}
          hint={`Batas bayar pukul 23:59 ${timezoneLabel()} pada tanggal ini.`}
        >
          <Controller
            name="expiresDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                id="expiresDate"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                today={todayInAppTimezone()}
                min={tomorrowInAppTimezone()}
                invalid={!!errors.expiresDate}
              />
            )}
          />
        </Field>
      </div>

      <div className="-mx-6 -mb-5 flex justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-4">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Batal
          </Button>
        )}
        <Button type="submit" loading={createInvoice.isPending}>
          Buat tagihan
        </Button>
      </div>
    </form>
  );
}
