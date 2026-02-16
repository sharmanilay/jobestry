import inlineCss from './widget.css?inline';
import { initAppWithShadow, withErrorBoundary, withSuspense } from '@extension/shared';
import { ErrorDisplay, LoadingSpinner } from '@extension/ui';
import App from '@src/matches/all/App';

const ROOT_ID = 'CEB-extension-all';
let rootElement: HTMLElement | null = null;

const Root = withErrorBoundary(withSuspense(App, <LoadingSpinner />), ErrorDisplay);

const init = async () => {
  console.log('[Jobestry UI] Initializing...');
  initAppWithShadow({ id: ROOT_ID, app: <Root />, inlineCss });
  rootElement = document.getElementById(ROOT_ID);
  console.log('[Jobestry UI] Initialized, rootElement:', rootElement);
};

init();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  if (!changes['jobestry-user-preferences']) return;
});
