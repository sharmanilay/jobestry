import { cn } from '@/lib/utils';
import type { ComponentPropsWithoutRef } from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md';

interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-700 text-gray-100',
  success: 'bg-emerald-900/30 text-emerald-400',
  warning: 'bg-amber-900/30 text-amber-200',
  danger: 'bg-red-900/30 text-red-400',
  info: 'bg-teal-900/30 text-teal-400',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-gray-400',
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  info: 'bg-teal-400',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export const Badge = ({ variant = 'default', size = 'sm', dot = false, className, children, ...props }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      variantStyles[variant],
      sizeStyles[size],
      className,
    )}
    {...props}>
    {dot && <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', dotColors[variant])} />}
    {children}
  </span>
);
