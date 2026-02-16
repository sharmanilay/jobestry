import { t } from '@extension/i18n';

const WarningIcon = () => (
  <svg className="mx-auto h-24 w-24 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      fill="none"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

export const ErrorHeader = () => (
  <div className="text-center">
    <WarningIcon />
    <h2 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">{t('displayErrorInfo')}</h2>
    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t('displayErrorDescription')}</p>
  </div>
);
