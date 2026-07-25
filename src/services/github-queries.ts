import type { CreateMutationOptions, CreateQueryOptions } from '@tanstack/svelte-query';

import type { GithubDeviceCodeResponse, GithubPullRequest, GithubSession, GithubUser } from '~/models/github.model';
import type { GithubLoginOptions } from '~/services/github-auth.service';

import { GithubApiService } from '~/services/github-api.service';
import { GithubAuthService } from '~/services/github-auth.service';
import { Logger } from '~/services/logger.service';
import { queryClient } from '~/services/query-client';
import { GithubAuthStore } from '~/stores/github-auth.store.svelte';

/** Root key for all GitHub queries — invalidated wholesale on login/logout. */
export const GITHUB_QUERY_KEY = ['github'] as const;

/** Authenticated viewer profile. */
export function viewerQueryOptions(): CreateQueryOptions<GithubUser> {
  return {
    queryKey: [...GITHUB_QUERY_KEY, 'viewer'],
    queryFn: async () => GithubApiService.getViewer(),
  };
}

/** All pull requests authored by the logged-in user. */
export function myPullRequestsQueryOptions(): CreateQueryOptions<GithubPullRequest[]> {
  return {
    queryKey: [...GITHUB_QUERY_KEY, 'prs', 'me'],
    queryFn: async () => GithubApiService.listMyPullRequests(),
  };
}

/** Drives a login flow and refreshes all GitHub queries on success. */
export function loginMutationOptions(): CreateMutationOptions<GithubSession, Error, GithubLoginOptions | void> {
  return {
    mutationKey: [...GITHUB_QUERY_KEY, 'login'],
    mutationFn: async options => GithubAuthService.login(options ?? undefined),
    onSuccess: async (session) => {
      // Fetch + persist the viewer so the header shows the user immediately.
      if (!session.user) {
        try {
          await GithubAuthStore.setUser(await GithubApiService.getViewer());
        } catch (err) {
          Logger.warn('Failed to fetch viewer after login', err);
        }
      }
      await queryClient.invalidateQueries({ queryKey: GITHUB_QUERY_KEY });
    },
  };
}

/** Logs out and clears cached GitHub data. */
export function logoutMutationOptions(): CreateMutationOptions<void, Error, void> {
  return {
    mutationKey: [...GITHUB_QUERY_KEY, 'logout'],
    mutationFn: async () => GithubAuthService.logout(),
    onSuccess: () => queryClient.removeQueries({ queryKey: GITHUB_QUERY_KEY }),
  };
}

export type { GithubDeviceCodeResponse };
