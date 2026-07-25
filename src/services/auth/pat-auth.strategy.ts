import type { GithubSession, GithubUser } from '~/models/github.model';

import { Octokit } from 'octokit';

import { GithubAuthStrategy } from '~/models/github.model';

function errorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
  const { status } = error as { status?: unknown };
  return typeof status === 'number' ? status : undefined;
}

function toGithubUser(data: { login: string; name?: string | null; avatar_url?: string; html_url?: string }): GithubUser {
  return {
    login: data.login,
    name: data.name,
    avatarUrl: data.avatar_url,
    htmlUrl: data.html_url,
  };
}

/** Validate a user-provided PAT before returning a session that can be persisted. */
export async function loginWithPersonalAccessToken(input: string): Promise<GithubSession> {
  const token = input.trim();
  if (!token) throw new Error('Enter a GitHub personal access token.');

  try {
    const client = new Octokit({ auth: token });
    const { data } = await client.rest.users.getAuthenticated();
    return {
      token,
      strategy: GithubAuthStrategy.Pat,
      user: toGithubUser(data),
    };
  } catch (error) {
    const status = errorStatus(error);
    if (status === 401) throw new Error('The personal access token is invalid or expired.');
    if (status === 403) {
      throw new Error('GitHub rejected this token. Check its repository permissions, organization approval, and SSO authorization.');
    }
    throw new Error('Unable to verify the personal access token with GitHub. Please try again.');
  }
}
