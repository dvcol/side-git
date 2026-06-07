import type { GithubSession, GithubTokenResponse } from '~/models/github.model';

import { GithubAuthStrategy } from '~/models/github.model';
import { GithubOAuthEndpoint } from '~/models/message.model';
import { assertClientId, AUTHORIZE_URL, GithubOAuthConfig } from '~/services/auth/github-oauth.config';
import { requestGithubOAuth } from '~/services/auth/github-oauth.proxy';
import { createPkcePair, randomToken } from '~/services/auth/pkce.utils';
import { Logger } from '~/services/logger.service';

/** Is the seamless web flow available in this context? */
export function isWebAuthAvailable(): boolean {
  return !!globalThis?.chrome?.identity?.launchWebAuthFlow;
}

/**
 * GitHub OAuth "web application flow" via {@link chrome.identity.launchWebAuthFlow}.
 *
 * Uses PKCE + a `state` nonce. GitHub still requires the `client_secret` at the token
 * endpoint even with PKCE, so it is sent here (embedded in the bundle — acceptable
 * because the redirect is locked to this extension's chromiumapp.org URL).
 */
export async function loginWithWebFlow(): Promise<GithubSession> {
  const clientId = assertClientId();
  if (!isWebAuthAvailable()) throw new Error('chrome.identity.launchWebAuthFlow is unavailable in this context');

  const redirectUri = chrome.identity.getRedirectURL();
  const state = randomToken(16);
  const pkce = await createPkcePair();

  const authUrl = new URL(AUTHORIZE_URL);
  authUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: GithubOAuthConfig.scope,
    state,
    code_challenge: pkce.challenge,
    code_challenge_method: pkce.method,
  }).toString();

  Logger.debug('Launching GitHub web auth flow', { redirectUri });

  const redirect = await chrome.identity.launchWebAuthFlow({ url: authUrl.toString(), interactive: true });
  if (!redirect) throw new Error('Authorization was cancelled');

  const returned = new URL(redirect);
  const returnedError = returned.searchParams.get('error');
  if (returnedError) throw new Error(returned.searchParams.get('error_description') ?? returnedError);
  if (returned.searchParams.get('state') !== state) throw new Error('OAuth state mismatch — possible CSRF, aborting');

  const code = returned.searchParams.get('code');
  if (!code) throw new Error('No authorization code returned by GitHub');

  const token = await requestGithubOAuth<GithubTokenResponse & Partial<{ error: string; error_description: string }>>(
    GithubOAuthEndpoint.AccessToken,
    {
      client_id: clientId,
      client_secret: GithubOAuthConfig.clientSecret,
      code,
      redirect_uri: redirectUri,
      code_verifier: pkce.verifier,
    },
  );
  if (token.error || !token.access_token) throw new Error(token.error_description ?? token.error ?? 'Token exchange failed');

  return {
    token: token.access_token,
    strategy: GithubAuthStrategy.Web,
    scope: token.scope,
  };
}
