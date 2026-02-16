import { cn } from '@/lib/utils';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface TabsProps extends Omit<ComponentPropsWithoutRef<'div'>, 'onChange'> {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'pills';
}

export const Tabs = ({ tabs, activeTab, onChange, variant = 'default', className, ...props }: TabsProps) => (
  <div
    className={cn(
      'flex gap-1',
      variant === 'default' && 'border-b border-[#525252]',
      variant === 'pills' && 'rounded-lg bg-[#292524] p-1',
      className,
    )}
    role="tablist"
    {...props}>
    {tabs.map(tab => (
      <button
        key={tab.id}
        role="tab"
        aria-selected={activeTab === tab.id}
        onClick={() => onChange(tab.id)}
        className={cn(
          'relative flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200',
          variant === 'default' && [
            '-mb-px border-b-2',
            activeTab === tab.id
              ? 'border-teal-400 text-teal-400'
              : 'border-transparent text-[#a8a29e] hover:text-[#e7e5e4]',
          ],
          variant === 'pills' && [
            'rounded-md',
            activeTab === tab.id ? 'bg-[#44403c] text-white shadow-sm' : 'text-[#a8a29e] hover:text-white',
          ],
        )}>
        {tab.icon}
        {tab.label}
        {tab.count !== undefined && (
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-xs',
              activeTab === tab.id ? 'bg-teal-900/50 text-teal-400' : 'bg-gray-600 text-gray-300',
            )}>
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

interface TabPanelProps extends ComponentPropsWithoutRef<'div'> {
  tabId: string;
  activeTab: string;
}

export const TabPanel = ({ tabId, activeTab, children, className, ...props }: TabPanelProps) => {
  if (tabId !== activeTab) return null;

  return (
    <div role="tabpanel" className={cn('animate-in fade-in-0 duration-200', className)} {...props}>
      {children}
    </div>
  );
};
