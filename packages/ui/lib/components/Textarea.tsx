import { cn } from '@/lib/utils';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

interface TextareaProps extends ComponentPropsWithoutRef<'textarea'> {
  label?: string;
  error?: string;
  hint?: string;
  maxLength?: number;
  showCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, maxLength, showCount = false, className, id, value, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const currentLength = typeof value === 'string' ? value.length : 0;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <div className="relative">
          <textarea
            ref={ref}
            id={inputId}
            value={value}
            maxLength={maxLength}
            className={cn(
              'w-full resize-none rounded-lg border bg-white px-4 py-3 text-sm transition-all duration-200',
              'placeholder:text-slate-400',
              'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500',
              'dark:border-slate-600 dark:bg-slate-800 dark:text-white',
              error ? 'border-red-500 focus:ring-red-500' : 'border-slate-200 dark:border-slate-600',
              className,
            )}
            {...props}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {hint && !error && <p className="text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
          </div>
          {showCount && maxLength && (
            <p className={cn('text-xs', currentLength >= maxLength ? 'text-red-500' : 'text-slate-400')}>
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
