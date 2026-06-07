/** GitHub OAuth App configuration, sourced from env (see env/.env.example). */
export const GithubOAuthConfig = {
  clientId: import.meta.env.VITE_GITHUB_CLIENT_ID ?? '',
  clientSecret: import.meta.env.VITE_GITHUB_CLIENT_SECRET ?? '',
  scope: import.meta.env.VITE_GITHUB_SCOPE ?? 'read:user repo',
} as const;

export const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
export const DEVICE_VERIFICATION_URL = 'https://github.com/login/device';

/** Throw early with an actionable message if the client id is missing. */
export function assertClientId(clientId = GithubOAuthConfig.clientId): string {
  if (!clientId) throw new Error('Missing VITE_GITHUB_CLIENT_ID — set it in env/.env.local (see env/.env.example)');
  return clientId;
}
