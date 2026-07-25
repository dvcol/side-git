import type { GithubSession } from '~/models/github.model';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GithubAuthStrategy } from '~/models/github.model';

const storageMocks = vi.hoisted(() => ({
  get: vi.fn(),
  remove: vi.fn(),
  set: vi.fn(),
}));

vi.mock('~/utils/browser/browser-storage.utils', () => ({
  storage: { local: storageMocks },
}));
vi.mock('~/services/logger.service', () => ({ Logger: { error: vi.fn() } }));

async function loadStore() {
  vi.resetModules();
  return (await import('./github-auth.store.svelte')).GithubAuthStore;
}

describe('githubAuthStore PAT sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMocks.get.mockResolvedValue(undefined);
    storageMocks.set.mockResolvedValue(undefined);
    storageMocks.remove.mockResolvedValue(undefined);
  });

  it('persists and clears a PAT session using the existing local storage key', async () => {
    const store = await loadStore();
    const session: GithubSession = {
      token: 'pat-token',
      strategy: GithubAuthStrategy.Pat,
      user: { login: 'octocat' },
    };

    await store.setSession(session);
    expect(store.isAuthenticated).toBe(true);
    expect(storageMocks.set).toHaveBeenCalledWith('github:session', session);

    await store.clear();
    expect(store.isAuthenticated).toBe(false);
    expect(storageMocks.remove).toHaveBeenCalledWith('github:session');
  });

  it('hydrates a persisted PAT session', async () => {
    const session: GithubSession = {
      token: 'pat-token',
      strategy: GithubAuthStrategy.Pat,
      user: { login: 'octocat' },
    };
    storageMocks.get.mockResolvedValue(session);
    const store = await loadStore();

    await expect(store.hydrate()).resolves.toBe(true);
    expect(store.token).toBe('pat-token');
    expect(store.strategy).toBe(GithubAuthStrategy.Pat);
    expect(store.user).toEqual({ login: 'octocat' });
  });
});
