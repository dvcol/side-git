/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv extends ImportMetaEnv {
  BASE_URL: string;
  MODE: string;
  DEV: boolean;
  PROD: boolean;
  SSR: boolean;

  PKG_VERSION?: string;
  PKG_NAME?: string;

  VITE_BASE?: string;
  VITE_WEB?: boolean;
  VITE_SOURCEMAP?: boolean;
  VITE_ZIP?: boolean;

  /** GitHub OAuth App client id (web + device flow). */
  VITE_GITHUB_CLIENT_ID?: string;
  /** GitHub OAuth App client secret (web flow only). */
  VITE_GITHUB_CLIENT_SECRET?: string;
  /** Space-separated OAuth scopes, e.g. `read:user repo`. */
  VITE_GITHUB_SCOPE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
