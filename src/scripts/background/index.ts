import { onVersionUpdate } from '@dvcol/web-extension-utils/chrome/runtime';
import { setPanelBehavior } from '@dvcol/web-extension-utils/chrome/side-panel';

import { MessageType } from '~/models/message.model';
import { registerGithubOAuthProxy } from '~/services/auth/github-oauth.proxy';
import { Logger } from '~/services/logger.service';
import { storage } from '~/utils/browser/browser-storage.utils';

Logger.debug('Background script started');

// Proxy GitHub OAuth POSTs (token exchange / device code / poll) — these endpoints
// lack CORS headers and must be called from a context with host permissions.
registerGithubOAuthProxy();

try {
  onVersionUpdate(async (details) => {
    Logger.debug('Extension updated', details);
    await storage.local.set(MessageType.VersionUpdate, { ...details, date: Date.now() });
  });
} catch (error) {
  Logger.error('Failed to handle version update', error);
}

setPanelBehavior?.({ openPanelOnActionClick: true }).catch((error) => {
  Logger.error('Failed to set panel behavior', error);
});
