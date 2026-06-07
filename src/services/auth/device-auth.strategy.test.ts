import { describe, expect, it } from 'vitest';

import { DevicePollAction, interpretDevicePoll } from './device-auth.strategy';

describe('interpretDevicePoll', () => {
  it('returns success with the token when access_token is present', () => {
    const result = interpretDevicePoll({ access_token: 'gho_abc', scope: 'repo' });
    expect(result).toEqual({ action: DevicePollAction.Success, token: 'gho_abc', scope: 'repo' });
  });

  it('waits while authorization is pending', () => {
    expect(interpretDevicePoll({ error: 'authorization_pending' })).toEqual({ action: DevicePollAction.Wait });
  });

  it('signals slow_down so the caller backs off', () => {
    expect(interpretDevicePoll({ error: 'slow_down' })).toEqual({ action: DevicePollAction.SlowDown });
  });

  it('fails with a friendly message when the code expires', () => {
    const result = interpretDevicePoll({ error: 'expired_token' });
    expect(result.action).toBe(DevicePollAction.Fail);
    expect(result.error).toMatch(/expired/i);
  });

  it('fails when access is denied', () => {
    const result = interpretDevicePoll({ error: 'access_denied' });
    expect(result.action).toBe(DevicePollAction.Fail);
    expect(result.error).toMatch(/denied/i);
  });

  it('fails with the error_description for unknown errors', () => {
    const result = interpretDevicePoll({ error: 'unsupported_grant_type', error_description: 'Bad grant' });
    expect(result).toEqual({ action: DevicePollAction.Fail, error: 'Bad grant' });
  });
});
