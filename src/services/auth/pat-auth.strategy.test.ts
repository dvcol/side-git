import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GithubAuthStrategy } from '~/models/github.model';

import { loginWithPersonalAccessToken } from './pat-auth.strategy';

const octokitMocks = vi.hoisted(() => ({
  constructorOptions: [] as Array<{ auth?: string }>,
  getAuthenticated: vi.fn(),
}));

vi.mock('octokit', () => ({
  Octokit: class {
    rest = { users: { getAuthenticated: octokitMocks.getAuthenticated } };

    constructor(options: { auth?: string }) {
      octokitMocks.constructorOptions.push(options);
    }
  },
}));

describe('loginWithPersonalAccessToken', () => {
  beforeEach(() => {
    octokitMocks.constructorOptions.length = 0;
    octokitMocks.getAuthenticated.mockReset();
  });

  it('rejects an empty token without contacting GitHub', async () => {
    await expect(loginWithPersonalAccessToken('   ')).rejects.toThrow(/enter.*token/i);
    expect(octokitMocks.getAuthenticated).not.toHaveBeenCalled();
  });

  it('trims and validates the token before returning a session with the viewer', async () => {
    octokitMocks.getAuthenticated.mockResolvedValue({
      data: {
        login: 'octocat',
        name: 'The Octocat',
        avatar_url: 'https://avatars.example/octocat',
        html_url: 'https://github.com/octocat',
      },
    });

    await expect(loginWithPersonalAccessToken('  github_pat_example  ')).resolves.toEqual({
      token: 'github_pat_example',
      strategy: GithubAuthStrategy.Pat,
      user: {
        login: 'octocat',
        name: 'The Octocat',
        avatarUrl: 'https://avatars.example/octocat',
        htmlUrl: 'https://github.com/octocat',
      },
    });
    expect(octokitMocks.constructorOptions).toEqual([{ auth: 'github_pat_example' }]);
    expect(octokitMocks.getAuthenticated).toHaveBeenCalledOnce();
  });

  it.each(['github_pat_fine_grained', 'ghp_classic'])('accepts the %s token format without prefix-specific validation', async (token) => {
    octokitMocks.getAuthenticated.mockResolvedValue({ data: { login: 'octocat' } });

    await expect(loginWithPersonalAccessToken(token)).resolves.toMatchObject({ token, strategy: GithubAuthStrategy.Pat });
    expect(octokitMocks.constructorOptions).toEqual([{ auth: token }]);
  });

  it('returns a friendly error for an invalid or expired token', async () => {
    octokitMocks.getAuthenticated.mockRejectedValue({ status: 401 });

    await expect(loginWithPersonalAccessToken('bad-token')).rejects.toThrow(/invalid or expired/i);
  });

  it('explains organization access requirements when GitHub rejects the token', async () => {
    octokitMocks.getAuthenticated.mockRejectedValue({ status: 403 });

    await expect(loginWithPersonalAccessToken('restricted-token')).rejects.toThrow(/organization approval.*SSO/i);
  });

  it('does not expose raw API errors', async () => {
    octokitMocks.getAuthenticated.mockRejectedValue(new Error('request included secret-token'));

    await expect(loginWithPersonalAccessToken('secret-token')).rejects.toThrow(
      'Unable to verify the personal access token with GitHub. Please try again.',
    );
  });
});
