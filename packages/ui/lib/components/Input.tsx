import { cn } from '@/lib/utils';
import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

interface InputProps extends ComponentPropsWithoutRef<'input'> {
  label?: string;
  error?: string;
  hint?: string;
  helperText?: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, helperText, icon, iconPosition = 'left', className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const displayText = helperText || hint;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-[#fafaf9]">
            {label}
          </label>
        )}

        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a8a29e]">{icon}</div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-lg border bg-[#292524] px-4 py-2.5 text-sm text-[#fafaf9]',
              'placeholder:text-[#a8a29e]',
              'transition-all duration-200 ease-out',
              'focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20',
              error ? 'border-red-400' : 'border-[#525252] hover:border-[#737373]',
              icon && iconPosition === 'left' && 'pl-10',
              icon && iconPosition === 'right' && 'pr-10',
              className,
            )}
            {...props}
          />

          {icon && iconPosition === 'right' && (
            <div className="absolute right-3 top-[60%] -translate-y-1/2 text-[#a8a29e]">{icon}</div>
          )}
        </div>

        {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}

        {displayText && !error && <p className="mt-1.5 text-sm text-[#d6d3d1]">{displayText}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
