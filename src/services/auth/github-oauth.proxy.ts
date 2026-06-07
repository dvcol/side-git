import type { GithubOAuthEndpoints, GithubOAuthFetchRequest, GithubOAuthFetchResponse } from '~/models/message.model';

import { GithubOAuthEndpoint, MessageType } from '~/models/message.model';
import { Logger } from '~/services/logger.service';

/**
 * GitHub's `login/*` OAuth endpoints don't send CORS headers, so the fetch must run
 * in the background service worker (which holds the `https://github.com/*` host
 * permission). This module is the single source of that logic:
 *
 * - {@link postGithubOAuth} performs the actual POST — invoked inside the background worker.
 * - {@link registerGithubOAuthProxy} wires it onto `runtime.onMessage` (call from background).
 * - {@link requestGithubOAuth} is the client-side caller used by the auth strategies.
 */

const ENDPOINT_URLS: Record<GithubOAuthEndpoints, string> = {
  [GithubOAuthEndpoint.DeviceCode]: 'https://github.com/login/device/code',
  [GithubOAuthEndpoint.AccessToken]: 'https://github.com/login/oauth/access_token',
};

/** Perform the OAuth POST and return parsed JSON. Runs in the background worker. */
export async function postGithubOAuth<T = unknown>(endpoint: GithubOAuthEndpoints, params: Record<string, string>): Promise<T> {
  const response = await fetch(ENDPOINT_URLS[endpoint], {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });
  if (!response.ok) throw new Error(`GitHub OAuth request failed (${response.status} ${response.statusText})`);
  return response.json() as Promise<T>;
}

function isOAuthFetchRequest(message: unknown): message is GithubOAuthFetchRequest {
  return !!message && typeof message === 'object' && (message as GithubOAuthFetchRequest).type === MessageType.GithubOAuthFetch;
}

/** Register the OAuth proxy listener on the background worker's runtime. */
export function registerGithubOAuthProxy() {
  const runtime = globalThis?.chrome?.runtime;
  if (!runtime?.onMessage) {
    Logger.warn('chrome.runtime.onMessage unavailable — GitHub OAuth proxy not registered');
    return;
  }
  runtime.onMessage.addListener((message: unknown, _sender, sendResponse: (response: GithubOAuthFetchResponse) => void) => {
    if (!isOAuthFetchRequest(message)) return undefined;
    postGithubOAuth(message.endpoint, message.params)
      .then(data => sendResponse({ ok: true, data }))
      .catch((error: unknown) => {
        Logger.error('GitHub OAuth proxy fetch failed', error);
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
      });
    // Returning true keeps the message channel open for the async sendResponse.
    return true;
  });
}

/** Client-side: ask the background worker to perform an OAuth POST and unwrap the result. */
export async function requestGithubOAuth<T = unknown>(endpoint: GithubOAuthEndpoints, params: Record<string, string>): Promise<T> {
  const runtime = globalThis?.chrome?.runtime;
  // No background worker (e.g. dev:web build): fall back to a direct fetch.
  if (!runtime?.sendMessage) return postGithubOAuth<T>(endpoint, params);

  const request: GithubOAuthFetchRequest = { type: MessageType.GithubOAuthFetch, endpoint, params };
  const response: GithubOAuthFetchResponse<T> | undefined = await runtime.sendMessage(request);
  if (!response) throw new Error('No response from GitHub OAuth proxy');
  if (!response.ok) throw new Error(response.error);
  return response.data;
}
