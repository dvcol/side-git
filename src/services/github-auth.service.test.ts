import type { GithubSession } from '~/models/github.model';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GithubAuthStrategy } from '~/models/github.model';

import { GithubAuthService } from './github-auth.service';

const mocks = vi.hoisted(() => ({
  clear: vi.fn(),
  deviceLogin: vi.fn(),
  isWebAuthAvailable: vi.fn(),
  patLogin: vi.fn(),
  setPending: vi.fn(),
  setSession: vi.fn(),
  webLogin: vi.fn(),
}));

vi.mock('~/services/auth/device-auth.strategy', () => ({ loginWithDeviceFlow: mocks.deviceLogin }));
vi.mock('~/services/auth/pat-auth.strategy', () => ({ loginWithPersonalAccessToken: mocks.patLogin }));
vi.mock('~/services/auth/web-auth.strategy', () => ({
  isWebAuthAvailable: mocks.isWebAuthAvailable,
  loginWithWebFlow: mocks.webLogin,
}));
vi.mock('~/stores/github-auth.store.svelte', () => ({
  GithubAuthStore: {
    clear: mocks.clear,
    setPending: mocks.setPending,
    setSession: mocks.setSession,
  },
}));
vi.mock('~/services/logger.service', () => ({
  Logger: { error: vi.fn(), info: vi.fn() },
}));

const webSession: GithubSession = { token: 'web-token', strategy: GithubAuthStrategy.Web };
const deviceSession: GithubSession = { token: 'device-token', strategy: GithubAuthStrategy.Device };
const patSession: GithubSession = { token: 'pat-token', strategy: GithubAuthStrategy.Pat, user: { login: 'octocat' } };

describe('githubAuthService.login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setSession.mockResolvedValue(undefined);
    mocks.clear.mockResolvedValue(undefined);
  });

  it('uses web OAuth by default when it is available', async () => {
    mocks.isWebAuthAvailable.mockReturnValue(true);
    mocks.webLogin.mockResolvedValue(webSession);

    await expect(GithubAuthService.login()).resolves.toEqual(webSession);
    expect(mocks.webLogin).toHaveBeenCalledOnce();
    expect(mocks.deviceLogin).not.toHaveBeenCalled();
  });

  it('falls back to device OAuth by default when web auth is unavailable', async () => {
    mocks.isWebAuthAvailable.mockReturnValue(false);
    mocks.deviceLogin.mockResolvedValue(deviceSession);

    await expect(GithubAuthService.login()).resolves.toEqual(deviceSession);
    expect(mocks.deviceLogin).toHaveBeenCalledOnce();
    expect(mocks.webLogin).not.toHaveBeenCalled();
  });

  it('passes a user-provided token to the PAT strategy and persists its validated session', async () => {
    mocks.patLogin.mockResolvedValue(patSession);

    await expect(GithubAuthService.login({ strategy: GithubAuthStrategy.Pat, token: 'pat-token' })).resolves.toEqual(patSession);
    expect(mocks.patLogin).toHaveBeenCalledWith('pat-token');
    expect(mocks.setPending).toHaveBeenCalledOnce();
    expect(mocks.setSession).toHaveBeenCalledWith(patSession);
  });

  it('clears auth state and does not persist when PAT validation fails', async () => {
    const error = new Error('The personal access token is invalid or expired.');
    mocks.patLogin.mockRejectedValue(error);

    await expect(GithubAuthService.login({ strategy: GithubAuthStrategy.Pat, token: 'bad-token' })).rejects.toBe(error);
    expect(mocks.setSession).not.toHaveBeenCalled();
    expect(mocks.clear).toHaveBeenCalledOnce();
  });
});
