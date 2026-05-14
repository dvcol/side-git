import { Logger } from '~/services/logger.service';
import { I18nStore } from '~/stores/i18n-store.svelte';
import { useI18nTranslate } from '~/utils/browser/browser-i18n.utils';
import { chromeI18n } from '~/utils/browser/browser.utils';

/**
 * Setup i18n function to either use chrome i18n resolver or a local store (for web use).
 * @param roots modules names
 * @see chrome.i18n.getMessage
 */
export function useI18n(...roots: string[]): ReturnType<typeof useI18nTranslate> {
  if (!chromeI18n) {
    I18nStore.init(import.meta.env.VITE_BASE).catch(err => Logger.error('Failed to initialize i18n store', err));
    return (value, ...modules) => I18nStore.i18n(value, ...(modules?.length ? modules : roots)).value;
  }

  return useI18nTranslate(...roots);
}

export async function waitI18nReady(): Promise<boolean> {
  if (!chromeI18n) return I18nStore.init(import.meta.env.VITE_BASE);
  return Promise.resolve(true);
}
