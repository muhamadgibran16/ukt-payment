import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/api-client';
import { env } from '@/config/env';
import { DEMO_ACCOUNTS } from '../constants';
import { useAuth } from '../lib/auth-context';
import { homePathFor } from '../lib/home-path';

const schema = z.object({
  email: z.email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});
type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const user = await login(values);
      navigate(homePathFor(user.role), { replace: true });
    } catch (e) {
      setError(getErrorMessage(e));
    }
  });

  const fillDemo = (email: string, password: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="nama@kampus.test"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
        </Field>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Masuk
        </Button>
      </form>

      {env.DEMO_PASSWORD && <DemoAccounts password={env.DEMO_PASSWORD} onPick={fillDemo} />}
    </div>
  );
}

function DemoAccounts({
  password,
  onPick,
}: {
  password: string;
  onPick: (email: string, password: string) => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Akun demo · password <code className="rounded bg-white px-1">{password}</code>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {DEMO_ACCOUNTS.map((acc) => (
          <button
            key={acc.email}
            type="button"
            onClick={() => onPick(acc.email, password)}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs text-slate-700 hover:border-brand-500 hover:text-brand-700"
          >
            {acc.label}
          </button>
        ))}
      </div>
    </div>
  );
}
