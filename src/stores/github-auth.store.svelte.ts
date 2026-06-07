import type { GithubAuthStatuses, GithubAuthStrategies, GithubSession, GithubUser } from '~/models/github.model';

import { GithubAuthStatus } from '~/models/github.model';
import { Logger } from '~/services/logger.service';
import { storage } from '~/utils/browser/browser-storage.utils';

/** storage.local key holding the persisted {@link GithubSession}. */
const SESSION_KEY = 'github:session';

let storeToken = $state<string | undefined>();
let storeUser = $state<GithubUser | undefined>();
let storeStatus = $state<GithubAuthStatuses>(GithubAuthStatus.Anonymous);
let storeStrategy = $state<GithubAuthStrategies | undefined>();
let storeScope = $state<string | undefined>();
let storeHydrated = false;

/**
 * Reactive GitHub auth session, mirroring the {@link I18nStore} runes-store pattern.
 *
 * The token is persisted to `storage.local` (never synced) so a returning user stays
 * logged in. Both OAuth strategies write the resulting session here via {@link setSession}.
 */
export class GithubAuthStore {
  static get token() {
    return storeToken;
  }

  static get user() {
    return storeUser;
  }

  static get status() {
    return storeStatus;
  }

  static get strategy() {
    return storeStrategy;
  }

  static get scope() {
    return storeScope;
  }

  static get isAuthenticated() {
    return storeStatus === GithubAuthStatus.Authenticated && !!storeToken;
  }

  /** Hydrate the session from storage once on startup. */
  static async hydrate() {
    if (storeHydrated) return this.isAuthenticated;
    storeHydrated = true;
    try {
      const session = await storage.local.get<GithubSession>(SESSION_KEY);
      if (session?.token) {
        storeToken = session.token;
        storeUser = session.user;
        storeStrategy = session.strategy;
        storeScope = session.scope;
        storeStatus = GithubAuthStatus.Authenticated;
      }
    } catch (err) {
      Logger.error('Failed to hydrate GitHub session', err);
    }
    return this.isAuthenticated;
  }

  /** Mark the flow as in-progress (e.g. while polling the device endpoint). */
  static setPending() {
    storeStatus = GithubAuthStatus.Pending;
  }

  /** Persist a freshly obtained session and flip to authenticated. */
  static async setSession(session: GithubSession) {
    storeToken = session.token;
    storeUser = session.user;
    storeStrategy = session.strategy;
    storeScope = session.scope;
    storeStatus = GithubAuthStatus.Authenticated;
    await storage.local.set(SESSION_KEY, session);
  }

  /** Update just the viewer profile (after fetching it post-login). */
  static async setUser(user: GithubUser) {
    storeUser = user;
    if (!storeToken) return;
    await storage.local.set<GithubSession>(SESSION_KEY, {
      token: storeToken,
      strategy: storeStrategy!,
      scope: storeScope,
      user,
    });
  }

  /** Clear the session (logout) and remove it from storage. */
  static async clear() {
    storeToken = undefined;
    storeUser = undefined;
    storeStrategy = undefined;
    storeScope = undefined;
    storeStatus = GithubAuthStatus.Anonymous;
    await storage.local.remove(SESSION_KEY);
  }
}
