import type { GithubDeviceCodeResponse, GithubSession, GithubTokenResponse } from '~/models/github.model';

import { GithubAuthStrategy } from '~/models/github.model';
import { GithubOAuthEndpoint } from '~/models/message.model';
import { assertClientId, GithubOAuthConfig } from '~/services/auth/github-oauth.config';
import { requestGithubOAuth } from '~/services/auth/github-oauth.proxy';
import { Logger } from '~/services/logger.service';

/** Raw payload from a device-flow poll: either a token or an OAuth error. */
export type DevicePollPayload = Partial<GithubTokenResponse> & Partial<{ error: string; error_description: string }>;

/** What the caller should do after interpreting a poll payload. */
export const DevicePollAction = {
  Success: 'success',
  Wait: 'wait',
  /** Increase the polling interval by 5s, per GitHub's `slow_down` response. */
  SlowDown: 'slow-down',
  Fail: 'fail',
} as const;

export type DevicePollActions = (typeof DevicePollAction)[keyof typeof DevicePollAction];

export interface DevicePollResult {
  action: DevicePollActions;
  token?: string;
  scope?: string;
  error?: string;
}

/**
 * Pure interpreter for a device-flow poll payload (unit-tested in isolation).
 * @see https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#error-codes-for-the-device-flow
 */
export function interpretDevicePoll(payload: DevicePollPayload): DevicePollResult {
  if (payload.access_token) return { action: DevicePollAction.Success, token: payload.access_token, scope: payload.scope };
  switch (payload.error) {
    case 'authorization_pending':
      return { action: DevicePollAction.Wait };
    case 'slow_down':
      return { action: DevicePollAction.SlowDown };
    case 'expired_token':
      return { action: DevicePollAction.Fail, error: 'The device code expired. Please try signing in again.' };
    case 'access_denied':
      return { action: DevicePollAction.Fail, error: 'Authorization was denied.' };
    case undefined:
    default:
      return { action: DevicePollAction.Fail, error: payload.error_description ?? payload.error ?? 'Device authorization failed' };
  }
}

async function delay(seconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}

export interface DeviceLoginCallbacks {
  /** Surface the user code + verification URL to the UI as soon as they're available. */
  onUserCode?: (info: GithubDeviceCodeResponse) => void;
  /** Abort signal so the UI can cancel an in-flight poll loop. */
  signal?: AbortSignal;
}

/**
 * GitHub OAuth device flow: request a code, surface it to the user, then poll until
 * they authorize. Requires no client secret and works without `chrome.identity`,
 * making it the fallback for unsupported browsers / the dev:web build.
 */
export async function loginWithDeviceFlow({ onUserCode, signal }: DeviceLoginCallbacks = {}): Promise<GithubSession> {
  const clientId = assertClientId();

  const device = await requestGithubOAuth<GithubDeviceCodeResponse>(GithubOAuthEndpoint.DeviceCode, {
    client_id: clientId,
    scope: GithubOAuthConfig.scope,
  });
  Logger.debug('Device flow started', { user_code: device.user_code, verification_uri: device.verification_uri });
  onUserCode?.(device);

  let interval = device.interval || 5;
  const deadline = Date.now() + device.expires_in * 1000;

  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error('Device authorization cancelled');
    await delay(interval);

    const payload = await requestGithubOAuth<DevicePollPayload>(GithubOAuthEndpoint.AccessToken, {
      client_id: clientId,
      device_code: device.device_code,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    });

    const result = interpretDevicePoll(payload);
    if (result.action === DevicePollAction.Success) {
      return { token: result.token!, strategy: GithubAuthStrategy.Device, scope: result.scope };
    }
    if (result.action === DevicePollAction.SlowDown) interval += 5;
    if (result.action === DevicePollAction.Fail) throw new Error(result.error);
  }

  throw new Error('The device code expired. Please try signing in again.');
}
