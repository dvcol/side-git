import type { GithubDeviceCodeResponse, GithubSession } from '~/models/github.model';

import { GithubAuthStrategy } from '~/models/github.model';
import { loginWithDeviceFlow } from '~/services/auth/device-auth.strategy';
import { loginWithPersonalAccessToken } from '~/services/auth/pat-auth.strategy';
import { isWebAuthAvailable, loginWithWebFlow } from '~/services/auth/web-auth.strategy';
import { Logger } from '~/services/logger.service';
import { GithubAuthStore } from '~/stores/github-auth.store.svelte';

export interface GithubLoginOptions {
  /** Force a strategy. Defaults to `web` when available, else `device`. */
  strategy?: (typeof GithubAuthStrategy)[keyof typeof GithubAuthStrategy];
  /** Device-flow only: surface the user code to the UI. */
  onUserCode?: (info: GithubDeviceCodeResponse) => void;
  /** Device-flow only: cancel an in-flight poll loop. */
  signal?: AbortSignal;
  /** PAT strategy only: user-provided personal access token. */
  token?: string;
}

/**
 * Orchestrates the GitHub authentication strategies behind one interface. The query layer
 * and UI only ever call {@link login} / {@link logout} and read {@link GithubAuthStore};
 * neither knows or cares which flow ran.
 */
export class GithubAuthService {
  /** Whether the seamless web flow can be used (else callers should fall back to device). */
  static get canUseWebFlow() {
    return isWebAuthAvailable();
  }

  static async login({ strategy, onUserCode, signal, token }: GithubLoginOptions = {}): Promise<GithubSession> {
    const resolved = strategy ?? (this.canUseWebFlow ? GithubAuthStrategy.Web : GithubAuthStrategy.Device);
    GithubAuthStore.setPending();
    try {
      let session: GithubSession;
      switch (resolved) {
        case GithubAuthStrategy.Web:
          session = await loginWithWebFlow();
          break;
        case GithubAuthStrategy.Device:
          session = await loginWithDeviceFlow({ onUserCode, signal });
          break;
        case GithubAuthStrategy.Pat:
          session = await loginWithPersonalAccessToken(token ?? '');
          break;
      }
      await GithubAuthStore.setSession(session);
      Logger.info('GitHub login succeeded', { strategy: resolved });
      return session;
    } catch (err) {
      // Reset to anonymous on failure so the UI leaves the pending state.
      await GithubAuthStore.clear();
      Logger.error('GitHub login failed', err);
      throw err;
    }
  }

  static async logout() {
    await GithubAuthStore.clear();
    Logger.info('GitHub logout');
  }
}
