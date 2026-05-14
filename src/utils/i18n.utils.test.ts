import * as Svelte from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { I18nStore } from '~/stores/i18n-store.svelte';
import * as I18nUtils from '~/utils/browser/browser-i18n.utils';

import { useI18n } from './i18n.utils';

describe('i18n.utils.ts', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const i18nStoreMock = {
    i18n: vi.fn().mockImplementation(() => ({
      key: 'key',
      substitution: [],
      value: 'value',
    })),
    lang: 'en',
    locales: { en: {} },
    addLocale: vi.fn(),
  };
  const chromeI18nMock = vi.fn();
  vi.spyOn(Svelte, 'get').mockImplementation((val: unknown) => val);
  vi.spyOn(I18nStore, 'i18n').mockImplementation(i18nStoreMock.i18n as never);
  vi.spyOn(I18nStore, 'addLocale').mockImplementation(i18nStoreMock.addLocale as never);
  vi.spyOn(I18nStore, 'lang', 'get').mockReturnValue(i18nStoreMock.lang);
  vi.spyOn(I18nStore, 'locales', 'get').mockReturnValue(i18nStoreMock.locales);
  vi.spyOn(I18nUtils, 'useI18nTranslate').mockImplementation(chromeI18nMock);

  it('should use the local store to resolve i18n', () => {
    expect.assertions(4);

    const i18n = useI18n('root');
    expect(i18n).toBeInstanceOf(Function);

    i18n('value');

    expect(i18nStoreMock.i18n).toHaveBeenCalledWith('value', 'root');

    i18n('other-value', 'module', 'sub-module');
    expect(i18nStoreMock.i18n).toHaveBeenCalledWith('other-value', 'module', 'sub-module');

    expect(chromeI18nMock).not.toHaveBeenCalled();
  });
});
