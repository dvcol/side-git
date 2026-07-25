import type { GithubSession } from '~/models/github.model';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GithubAuthStrategy } from '~/models/github.model';

import { loginMutationOptions } from './github-queries';

const mocks = vi.hoisted(() => ({
  getViewer: vi.fn(),
  invalidateQueries: vi.fn(),
  login: vi.fn(),
  setUser: vi.fn(),
}));

vi.mock('~/services/github-api.service', () => ({ GithubApiService: { getViewer: mocks.getViewer } }));
vi.mock('~/services/github-auth.service', () => ({ GithubAuthService: { login: mocks.login } }));
vi.mock('~/services/query-client', () => ({
  queryClient: { invalidateQueries: mocks.invalidateQueries, removeQueries: vi.fn() },
}));
vi.mock('~/stores/github-auth.store.svelte', () => ({ GithubAuthStore: { setUser: mocks.setUser } }));
vi.mock('~/services/logger.service', () => ({ Logger: { warn: vi.fn() } }));

describe('loginMutationOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invalidateQueries.mockResolvedValue(undefined);
    mocks.setUser.mockResolvedValue(undefined);
  });

  it('does not fetch the viewer again when PAT validation supplied it', async () => {
    const session: GithubSession = {
      token: 'pat-token',
      strategy: GithubAuthStrategy.Pat,
      user: { login: 'octocat' },
    };
    const onSuccess = loginMutationOptions().onSuccess as (data: GithubSession) => Promise<void>;

    await onSuccess(session);

    expect(mocks.getViewer).not.toHaveBeenCalled();
    expect(mocks.setUser).not.toHaveBeenCalled();
    expect(mocks.invalidateQueries).toHaveBeenCalledOnce();
  });

  it('keeps the existing viewer fetch for OAuth sessions', async () => {
    const session: GithubSession = { token: 'web-token', strategy: GithubAuthStrategy.Web };
    const user = { login: 'octocat' };
    mocks.getViewer.mockResolvedValue(user);
    const onSuccess = loginMutationOptions().onSuccess as (data: GithubSession) => Promise<void>;

    await onSuccess(session);

    expect(mocks.getViewer).toHaveBeenCalledOnce();
    expect(mocks.setUser).toHaveBeenCalledWith(user);
    expect(mocks.invalidateQueries).toHaveBeenCalledOnce();
  });
});
