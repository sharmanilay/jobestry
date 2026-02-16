import '@src/index.css';
import Popup from '@src/Popup';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import type { FallbackProps } from 'react-error-boundary';

const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
  <div style={{ padding: 20, textAlign: 'center' }}>
    <div style={{ color: '#dc2626', fontWeight: 'bold', marginBottom: 8 }}>Something went wrong</div>
    <div style={{ color: '#7f1d1d', fontSize: 12, marginBottom: 16 }}>{error.message}</div>
    <button
      onClick={resetErrorBoundary}
      style={{
        padding: '8px 16px',
        background: '#dc2626',
        color: 'white',
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
      }}>
      Try Again
    </button>
  </div>
);

const init = () => {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Can not find #app-container');
  }
  const root = createRoot(appContainer);

  root.render(
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Popup />
    </ErrorBoundary>,
  );
};

init();
