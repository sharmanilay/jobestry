import { cn } from '@/lib/utils';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

interface CardProps extends ComponentPropsWithoutRef<'div'> {
  variant?: 'default' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const variantStyles: Record<string, string> = {
  default: 'bg-[#292524] border border-[#525252]',
  outline: 'bg-transparent border border-[#525252]',
};

const paddingStyles: Record<string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card = ({
  variant = 'default',
  padding = 'md',
  hover = false,
  className,
  children,
  ...props
}: CardProps) => (
  <div
    className={cn(
      'rounded-xl transition-all duration-200',
      variantStyles[variant],
      paddingStyles[padding],
      hover && 'cursor-pointer hover:border-[#737373] hover:shadow-lg',
      className,
    )}
    {...props}>
    {children}
  </div>
);

interface CardHeaderProps extends ComponentPropsWithoutRef<'div'> {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export const CardHeader = ({ title, subtitle, action, className, ...props }: CardHeaderProps) => (
  <div className={cn('mb-4 flex items-start justify-between gap-4', className)} {...props}>
    <div className="min-w-0 flex-1">
      <h3 className="text-lg font-semibold text-[#fafaf9]">{title}</h3>
      {subtitle && <p className="mt-0.5 text-sm text-[#d6d3d1]">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

export const CardContent = ({ className, children, ...props }: ComponentPropsWithoutRef<'div'>) => (
  <div className={cn('', className)} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ className, children, ...props }: ComponentPropsWithoutRef<'div'>) => (
  <div className={cn('mt-4 flex items-center gap-3 border-t border-[#525252] pt-4', className)} {...props}>
    {children}
  </div>
);
