import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, children, className }: FormSectionProps) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
          {title}
        </span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        {children}
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Field({ label, required, error, fullWidth, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth && 'col-span-2')}>
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
