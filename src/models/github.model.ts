/** Which authentication method produced the current session. */
export const GithubAuthStrategy = {
  /** chrome.identity.launchWebAuthFlow + PKCE (default). */
  Web: 'web',
  /** OAuth device flow (no client secret, code-paste fallback). */
  Device: 'device',
  /** User-provided personal access token. */
  Pat: 'pat',
} as const;

export type GithubAuthStrategies = (typeof GithubAuthStrategy)[keyof typeof GithubAuthStrategy];

/** Lifecycle of the GitHub auth session. */
export const GithubAuthStatus = {
  Anonymous: 'anonymous',
  Pending: 'pending',
  Authenticated: 'authenticated',
} as const;

export type GithubAuthStatuses = (typeof GithubAuthStatus)[keyof typeof GithubAuthStatus];

/** Minimal viewer profile persisted alongside the token. */
export interface GithubUser {
  login: string;
  name?: string | null;
  avatarUrl?: string;
  htmlUrl?: string;
}

/** Persisted auth session (token + viewer). Stored in storage.local. */
export interface GithubSession {
  token: string;
  strategy: GithubAuthStrategies;
  scope?: string;
  user?: GithubUser;
}

/** OAuth token endpoint success payload (web + device flows). */
export interface GithubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

/** OAuth error payload (e.g. authorization_pending, slow_down, access_denied). */
export interface GithubOAuthError {
  error: string;
  error_description?: string;
  error_uri?: string;
}

/** Device-code endpoint response (POST /login/device/code). */
export interface GithubDeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

/** A pull request as surfaced in the demo list. */
export interface GithubPullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  /** owner/repo derived from the issue's repository_url. */
  repository: string;
  htmlUrl: string;
  draft?: boolean;
  createdAt: string;
  updatedAt: string;
}
