import type { Manifest } from 'webextension-polyfill';

import fs from 'fs-extra';

import pkg from '../package.json';
import { getDirName, isDev, outDir, port, resolveParent } from './utils';

const Endpoints = {
  Dev: 'http://localhost' as const,
} as const;

function getExtensionPages(_dev: boolean, _port: number) {
  if (_dev && _port) return `script-src 'self' ${Endpoints.Dev}:${_port}; object-src 'self' ${Endpoints.Dev}:${_port}`;
  return "script-src 'self'; object-src 'self'";
}

function getHostPermissions(_dev: boolean, _port: number) {
  const permissions: Manifest.Permission[] = [
    // GitHub OAuth endpoints (login/oauth/*, login/device/*) lack CORS headers, so the
    // background worker needs host access to call them. The REST API is reached via Octokit.
    'https://github.com/*',
    'https://api.github.com/*',
  ];
  if (_dev) permissions.push(`${Endpoints.Dev}:${_port}/*`);
  return permissions;
}

export type WebManifest = Manifest.WebExtensionManifest & {
  side_panel: Record<string, string>;
  /** Chromium-only: pins the extension id so the OAuth redirect URL stays stable. */
  key?: string;
};

export const manifest: WebManifest = {
  manifest_version: 3,
  name: pkg.title || pkg.name,
  version: pkg.version,
  description: pkg.description,
  default_locale: 'en',
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  options_ui: {
    page: 'views/options/index.html',
    open_in_tab: true,
  },
  action: {
    default_title: pkg.title || pkg.name,
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
    },
    default_popup: 'views/popup/index.html',
  },
  side_panel: {
    default_path: 'views/panel/index.html',
  },
  background: {
    service_worker: 'scripts/background.js',
    type: 'module',
  },
  content_scripts: [
    {
      matches: [
        'https://github.com/*',
        'https://*.github.com/*',
        'https://*.githubusercontent.com/*',
        'https://*.githubassets.com/*',
        // github action logs
        'https://productionresultssa13.blob.core.windows.net/actions-results/*',
      ],
      js: ['scripts/content.js'],
      run_at: 'document_idle',
    },
  ],
  // `identity` powers chrome.identity.launchWebAuthFlow (GitHub web OAuth flow).
  permissions: ['storage', 'tabs', 'contextMenus', 'sidePanel', 'identity'],
  // A stable `key` pins the extension id (and thus the https://<id>.chromiumapp.org/
  // OAuth redirect) across reloads. Generate one and register the redirect on the
  // OAuth App, e.g.: `openssl genrsa 2048 | openssl rsa -pubout -outform DER | base64 -w0`.
  // Set it via the MANIFEST_KEY env var so the public key never lands in git.
  ...(process.env.MANIFEST_KEY ? { key: process.env.MANIFEST_KEY } : {}),
  web_accessible_resources: [],
  host_permissions: getHostPermissions(isDev, port),
  content_security_policy: {
    // Adds localhost for vite hot reload
    extension_pages: getExtensionPages(isDev, port),
  },
};

export async function writeManifest() {
  fs.ensureDirSync(resolveParent(outDir));
  fs.writeJSONSync(resolveParent(`${outDir}/manifest.json`), manifest, {
    spaces: 2,
  });
  console.info(`Writing manifest.json to '${getDirName()}/${outDir}/manifest.json'`);
}
