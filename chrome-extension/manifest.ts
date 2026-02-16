import { readFileSync } from 'node:fs';
import type { ManifestType } from '@extension/shared';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

/**
 * @prop default_locale
 * if you want to support multiple languages, you can use the following reference
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Internationalization
 *
 * @prop browser_specific_settings
 * Must be unique to your extension to upload to addons.mozilla.org
 * (you can delete if you only want a chrome extension)
 *
 * @prop permissions
 * Firefox doesn't support sidePanel (It will be deleted in manifest parser)
 *
 * @prop content_scripts
 * css: ['content.css'], // public folder
 */
const manifest = {
  manifest_version: 3,
  default_locale: 'en',
  name: '__MSG_extensionName__',
  browser_specific_settings: {
    gecko: {
      id: 'jobestry@jobestry.app',
      strict_min_version: '109.0',
    },
  },
  version: packageJson.version,
  description: '__MSG_extensionDescription__',
  // Default job site domains - users can add more from popup or hotkey
  host_permissions: [
    '*://*.linkedin.com/*',
    '*://*.indeed.com/*',
    '*://*.glassdoor.com/*',
    '*://*.greenhouse.io/*',
    '*://*.lever.co/*',
    '*://*.ashbyhq.com/*',
    '*://*.workday.com/*',
    '*://*.icims.com/*',
    '*://*.taleo.net/*',
    '*://*.bamboohr.com/*',
    '*://*.smartrecruiters.com/*',
    '*://*.monster.com/*',
    '*://*.ziprecruiter.com/*',
    '*://*.hired.com/*',
    '*://*.angel.co/*',
  ],
  permissions: ['storage', 'scripting', 'tabs', 'notifications', 'sidePanel', 'contextMenus'],
  commands: {
    'toggle-sidebar': {
      suggested_key: {
        default: 'Ctrl+Shift+K',
        mac: 'Command+Shift+K',
      },
      description: 'Toggle Jobestry sidebar',
    },
    'quick-fill': {
      suggested_key: {
        default: 'Ctrl+Shift+F',
        mac: 'Command+Shift+F',
      },
      description: 'Quick fill all fields',
    },
    'generate-cover-letter': {
      suggested_key: {
        default: 'Ctrl+Shift+L',
        mac: 'Command+Shift+L',
      },
      description: 'Generate cover letter',
    },
    'save-job': {
      suggested_key: {
        default: 'Ctrl+Shift+S',
        mac: 'Command+Shift+S',
      },
      description: 'Save current job to tracker',
    },
  },
  options_page: 'options/index.html',
  background: {
    service_worker: 'background.js',
    type: 'module',
  },
  action: {
    default_popup: 'popup/index.html',
    default_icon: 'icon-34.png',
  },
  icons: {
    '16': 'icon-34.png',
    '32': 'icon-34.png',
    '48': 'icon-34.png',
    '128': 'icon-128.png',
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*', '<all_urls>'],
      js: ['content/all.iife.js'],
    },
    {
      matches: ['http://*/*', 'https://*/*', '<all_urls>'],
      js: ['content-ui/all.iife.js'],
    },
    {
      matches: ['http://*/*', 'https://*/*', '<all_urls>'],
      css: ['content.css'],
    },
  ],
} satisfies ManifestType;

export default manifest;
