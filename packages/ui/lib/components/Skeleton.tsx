import { cn } from '@/lib/utils';
import type { ComponentPropsWithoutRef } from 'react';

interface SkeletonProps extends ComponentPropsWithoutRef<'div'> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton = ({ variant = 'rectangular', width, height, className, ...props }: SkeletonProps) => {
  const variantStyles = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={cn('animate-pulse bg-slate-200 dark:bg-slate-700', variantStyles[variant], className)}
      style={{
        width: width ?? (variant === 'text' ? '100%' : undefined),
        height: height ?? (variant === 'text' ? '1rem' : undefined),
      }}
      {...props}
    />
  );
};

interface SkeletonCardProps {
  lines?: number;
}

export const SkeletonCard = ({ lines = 3 }: SkeletonCardProps) => (
  <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
    <div className="flex items-center gap-3">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </div>
    </div>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} variant="text" width={i === lines - 1 ? '70%' : '100%'} />
    ))}
  </div>
);

export const SkeletonInput = ({ label = true }: { label?: boolean }) => (
  <div className="space-y-1.5">
    {label && <Skeleton variant="text" width={80} height={16} />}
    <Skeleton variant="rectangular" height={40} />
  </div>
);
