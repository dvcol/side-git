import type { VersionUpdateDetails } from '@dvcol/web-extension-utils/chrome/models';

export const MessageType = {
  VersionUpdate: 'version-update',
  /** Proxy a GitHub OAuth fetch (token exchange / device code / poll) via the background worker. */
  GithubOAuthFetch: 'github-oauth-fetch',
} as const;

export type MessageTypes = (typeof MessageType)[keyof typeof MessageType];

/** Which GitHub OAuth endpoint the background worker should POST to. */
export const GithubOAuthEndpoint = {
  DeviceCode: 'device-code',
  AccessToken: 'access-token',
} as const;

export type GithubOAuthEndpoints = (typeof GithubOAuthEndpoint)[keyof typeof GithubOAuthEndpoint];

/** Request body for a {@link MessageType.GithubOAuthFetch} message. */
export interface GithubOAuthFetchRequest {
  type: typeof MessageType.GithubOAuthFetch;
  endpoint: GithubOAuthEndpoints;
  /** Form params POSTed to the endpoint (client_id, code, device_code, ...). */
  params: Record<string, string>;
}

/** Response from the background worker: parsed JSON or an error. */
export type GithubOAuthFetchResponse<T = unknown> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Type union of possible message payloads
 */
export type MessagePayload<T extends MessageTypes = MessageTypes> = T extends typeof MessageType.VersionUpdate
  ? VersionUpdateDetails & { date: number }
  : T extends typeof MessageType.GithubOAuthFetch
    ? GithubOAuthFetchRequest
    : MessageTypes;
