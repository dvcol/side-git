import type { Locale, Locales } from '~/models/i18n.model';
import type { BrowserI18nInput } from '~/utils/browser/browser-i18n.utils';

import { Logger } from '~/services/logger.service';

let storeLang = $state<string>('en');
let storeLocales = $state<Locales>({});
let storeReady = false;

const storeLocale: Locale | undefined = $derived(storeLocales[storeLang]);

export class I18nStore {
  static baseUri?: string;

  static async init(baseUri: string = './') {
    this.baseUri = baseUri;
    if (this.ready) return true;
    if (import.meta.hot) {
      Logger.debug('Listening to i18n HMR changes');
      import.meta.hot.send('fetch:i18n');
      import.meta.hot.on('update:i18n', (data: { lang: string; locale: Locale }[]) => {
        data?.forEach(({ lang, locale }) => I18nStore.addLocale(locale, lang, true));
      });
      storeReady = true;
    } else if (!I18nStore.locale) {
      try {
        const response = await fetch(new URL(`${this.baseUri}_locales/en/messages.json`, new URL(import.meta.url).origin));
        const locale = await response.json() as Locale;
        I18nStore.addLocale(locale, 'en');
        storeReady = true;
      } catch (err) {
        Logger.error('Failed to fetch locale', err);
      }
    }
    return this.ready;
  }

  static get ready() {
    return storeReady;
  }

  static get lang() {
    return storeLang;
  }

  static get locales() {
    return storeLocales;
  }

  static get locale() {
    return storeLocale;
  }

  static i18n = (
    value: string | BrowserI18nInput,
    ...modules: string[]
  ): {
    key: string;
    substitution?: string[];
    value: string;
  } => {
    const path: string = Array.isArray(modules) ? modules.join('__') : modules;

    let key: string;
    let substitution: string[] = [];
    if (typeof value === 'string') {
      key = path ? `${path}__${value}` : value;
    } else {
      key = path ? `${path}__${value.key}` : value.key;
      substitution = value?.substitutions;
    }

    // @see https://github.com/sveltejs/svelte/issues/12286#issuecomment-2207523621
    const reactiveI18n = $derived.by(() => {
      let result: string = storeLocale?.[key]?.message ?? key;

      if (substitution?.length) {
        for (let i = 0; i < substitution.length; i += 1) {
          result = result?.replace(`$${i + 1}`, substitution[i]);
        }
      }
      return result;
    });

    return {
      get key() {
        return key;
      },
      get substitution() {
        return substitution;
      },
      get value() {
        return reactiveI18n;
      },
    };
  };

  static addLocale = (_locale: Locale, _lang = this.lang, merge = false) => {
    storeLocales = {
      ...this.locales,
      [_lang]: merge ? { ...this.locales[_lang], ..._locale } : _locale,
    };
    return this.locales;
  };

  static setLang(value: string) {
    storeLang = value;
  }
}
