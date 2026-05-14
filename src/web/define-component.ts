export enum WebComponents {
  WebExtensionTemplate = 'wc-web-extension-template',
}

export interface DefineOptions {
  baseUrl?: string;
  view?: { option?: boolean; popup?: boolean; panel?: boolean; web?: boolean };
}
export type DefineComponent = (options?: DefineOptions, component?: WebComponents) => Promise<CustomElementConstructor>;

export const defineComponent: DefineComponent = async (options = {}, component = WebComponents.WebExtensionTemplate) => {
  if (customElements.get(component)) {
    console.warn(`Custom element '${component}' is already defined.`);
  } else {
    const [{ createWc }] = await Promise.all([import('./create-wc')]);
    customElements.define(component, createWc(options));
  }
  return customElements.whenDefined(component);
};

export default defineComponent;
