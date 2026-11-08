import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const fieldClass =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 shadow-sm transition-colors ' +
  'placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-100 aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-100';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldClass, 'h-10', className)} {...props} />
  ),
);
Input.displayName = 'Input';
