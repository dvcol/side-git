import { defineSvelteConfig } from '@dvcol/eslint-config';

export default defineSvelteConfig({
  typescript: {
    tsconfigPath: 'tsconfig.eslint.json',
  },
});
