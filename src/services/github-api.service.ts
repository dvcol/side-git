import type { GithubPullRequest, GithubUser } from '~/models/github.model';

import { Octokit } from 'octokit';

import { Logger } from '~/services/logger.service';
import { GithubAuthStore } from '~/stores/github-auth.store.svelte';

/** owner/repo from an issue's `repository_url` (…/repos/owner/repo). */
function repoFromUrl(repositoryUrl?: string): string {
  if (!repositoryUrl) return '';
  return repositoryUrl.split('/repos/').at(1) ?? '';
}

/**
 * Thin Octokit wrapper. Holds a single client memoized on the current token (rebuilt
 * when the token changes, cleared on logout) and exposes typed, app-specific calls
 * consumed by the svelte-query layer.
 */
export class GithubApiService {
  static #client?: Octokit;
  static #token?: string;

  /** Octokit instance for the current token, or `undefined` when anonymous. */
  static getClient(): Octokit | undefined {
    const token = GithubAuthStore.token;
    if (!token) {
      this.#client = undefined;
      this.#token = undefined;
      return undefined;
    }
    if (!this.#client || this.#token !== token) {
      this.#client = new Octokit({ auth: token });
      this.#token = token;
    }
    return this.#client;
  }

  static #requireClient(): Octokit {
    const client = this.getClient();
    if (!client) throw new Error('Not authenticated with GitHub');
    return client;
  }

  /** Authenticated viewer profile. */
  static async getViewer(): Promise<GithubUser> {
    const { data } = await this.#requireClient().rest.users.getAuthenticated();
    return {
      login: data.login,
      name: data.name,
      avatarUrl: data.avatar_url,
      htmlUrl: data.html_url,
    };
  }

  /** Every pull request authored by the logged-in user, across all repos (paginated). */
  static async listMyPullRequests(): Promise<GithubPullRequest[]> {
    const client = this.#requireClient();
    const items = await client.paginate(client.rest.search.issuesAndPullRequests, {
      q: 'is:pr author:@me',
      advanced_search: 'true',
      per_page: 100,
      sort: 'updated',
      order: 'desc',
    });
    Logger.debug('Fetched pull requests', { count: items.length });
    return items.map(item => ({
      id: item.id,
      number: item.number,
      title: item.title,
      state: item.state,
      repository: repoFromUrl(item.repository_url),
      htmlUrl: item.html_url,
      draft: item.draft,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  }
}
