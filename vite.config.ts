import type { PluginOption } from 'vite';

import { execFile } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { promisify } from 'node:util';

import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig, loadEnv } from 'vite';
import { checker } from 'vite-plugin-checker';
import dtsPlugin from 'vite-plugin-dts';
import { VitePWA } from 'vite-plugin-pwa';

import pkg from './package.json';
import { isDev, outDir, port, resolveParent, sourcemap } from './scripts/utils';

const execFileAsync = promisify(execFile);

function getInput(hmr: boolean, _isWeb: boolean): Record<string, string> {
  if (hmr) return {
    background: resolveParent('src/scripts/background/index.ts'),
    content: resolveParent('src/scripts/content/index.ts'),
  };

  if (_isWeb) return {
    web: resolveParent('src/index.html'),
    lib: resolveParent('src/index.ts'),
    entry: resolveParent('src/web/define-component.ts'),
  };
  return {
    background: resolveParent('src/scripts/background/index.ts'),
    content: resolveParent('src/scripts/content/index.ts'),
    options: resolveParent('src/views/options/index.html'),
    popup: resolveParent('src/views/popup/index.html'),
    panel: resolveParent('src/views/panel/index.html'),
  };
}

const scriptDirRegex = /src\/scripts\/([^/]+)$/;
function getScriptName(srcDir: string) {
  const match = srcDir?.match(scriptDirRegex);
  if (!match) return;
  return match[1];
}

const i18nRegex = /.*src\/i18n\/([a-zA-Z]+)\/.*\.json/;
const slashRegex = /\\/g;
const htmlRegex = /"\/assets\//g;

type JsonLocale = Record<string, string>;
function getPlugins(_isDev: boolean, _isWeb: boolean, _zip: boolean): PluginOption[] {
  const plugins: PluginOption[] = [
    svelte({
      preprocess: vitePreprocess(),
      emitCss: false,
    }),
    checker({
      typescript: {
        tsconfigPath: 'tsconfig.app.json',
      },
    }),
    {
      name: 'i18n-hmr',
      configureServer: (server) => {
        console.info('server start');
        server.ws.on('fetch:i18n', async () => {
          const dir = await readdir(`${outDir}/_locales`);
          const locales = dir.map(async _lang =>
            readFile(`${outDir}/_locales/${_lang}/messages.json`, { encoding: 'utf-8' }).then(locale => ({ lang: _lang, locale: JSON.parse(locale) as JsonLocale })),
          );
          server.ws.send({
            type: 'custom',
            event: 'update:i18n',
            data: await Promise.all(locales),
          });
        });
      },
      handleHotUpdate: async ({ server, file, read, modules }) => {
        const lang = file.match(i18nRegex)?.[1];
        if (typeof lang !== 'string') return modules;
        console.info('Emit new i18n', file);
        const locale = JSON.parse(await read()) as JsonLocale;
        server.ws.send({
          type: 'custom',
          event: 'update:i18n',
          data: [{ lang, locale }],
        });
        return modules;
      },
    },
    // rewrite assets to use relative path
    {
      name: 'assets-rewrite',
      enforce: 'post',
      apply: 'build',
      transformIndexHtml: (html, { path }) => html.replace(htmlRegex, `"${relative(dirname(path), '/assets').replace(slashRegex, '/')}/`),
    },

    {
      name: 'write-to-disk',
      apply: 'serve',
      handleHotUpdate: async ({ file, server: { config } }) => {
        const name = getScriptName(dirname(file));
        if (!name) return;
        const outPath = `${join(config.build.outDir, `scripts/${name}`)}.js`;
        await writeFile(outPath, `import 'http://localhost:3303/scripts/${name}/index.ts';`);
      },
    },
  ];

  if (!_isDev && _isWeb) {
    plugins.push(
      dtsPlugin({
        tsconfigPath: resolveParent('tsconfig.app.json'),
        include: ['index.ts', 'web/define-component.ts'],
        entryRoot: resolveParent('src'),
        outDirs: resolveParent(`${outDir}/lib`),
      }),
      VitePWA({
        scope: '/side-git/',
        registerType: 'autoUpdate',
        includeAssets: ['**/favicon.ico', '**/*.svg', '**/*.png', '**/*.webp', '**/*.json'],
        manifest: {
          name: pkg.title || pkg.name,
          short_name: 'Side Git',
          description: pkg.description,
          theme_color: '#ff3c00',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
        workbox: {
          sourcemap: (isDev || sourcemap),
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,mp4}'],
        },
      }),
    );
  }

  // Zip the built extension (manifest at the archive root) for store upload.
  // Toggled by VITE_ZIP so regular dev/web builds are unaffected. Shells out to
  // the native `zip` with the child `cwd` set to the output dir — no shell `cd`,
  // paths resolved absolutely, `.` keeps dotfiles and `-x` skips a stale archive.
  if (_zip && !_isWeb) {
    plugins.push({
      name: 'zip-dist',
      apply: 'build',
      closeBundle: {
        order: 'post',
        sequential: true,
        handler: async () => {
          const dir = resolveParent(outDir);
          const name = `${pkg.name.split('/').pop()}.zip`;
          await execFileAsync('zip', ['-r', name, '.', '-x', name], { cwd: dir });
          console.info(`Zipped extension build to '${dir}/${name}'`);
        },
      },
    });
  }

  return plugins;
}

export default defineConfig(({ mode }) => {
  const env: NodeJS.Process['env'] = { ...process.env, ...loadEnv(mode, process.cwd()) };
  const isWeb: boolean = env.VITE_WEB === 'true';
  const sourcemap: boolean = env.VITE_SOURCEMAP === 'true';
  const zip: boolean = env.VITE_ZIP === 'true';
  return {
    root: resolveParent('src'),
    envDir: resolveParent('env'),
    resolve: {
      alias: {
        'src': fileURLToPath(new URL('./src', import.meta.url)),
        '~': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    define: {
      '__DEV__': isDev,
      '__VUE_OPTIONS_API__': false,
      '__VUE_PROD_DEVTOOLS__': isDev,
      'import.meta.env.PKG_VERSION': JSON.stringify(pkg.version),
      'import.meta.env.PKG_NAME': JSON.stringify(pkg.name),
    },
    devtools: {
      enabled: process.env.VITE_DEVTOOLS === 'true',
    },
    plugins: getPlugins(isDev, isWeb, zip),
    base: env.VITE_BASE ?? './',
    server: {
      port,
      open: true,
      host: true,
      hmr: {
        host: 'localhost',
      },
    },
    preview: {
      port: port + 1,
      cors: true,
      open: true,
      host: true,
    },
    build: {
      outDir: resolveParent(outDir),
      sourcemap: (isDev || sourcemap) ? 'inline' : false,
      minify: false,
      rollupOptions: {
        preserveEntrySignatures: 'allow-extension',
        input: getInput(isDev, isWeb),
        output: {
          minifyInternalExports: false,
          chunkFileNames: 'chunks/[name]-[hash].chunk.js',
          entryFileNames: (entry) => {
            if (entry.name === 'background') return 'scripts/[name].js';
            if (entry.name === 'content') return 'scripts/[name].js';
            if (entry.name === 'entry') return 'entry/index.js';
            if (entry.name === 'lib') return 'lib/index.js';
            return 'scripts/[name]-[hash].js';
          },
          assetFileNames: (asset) => {
            const format = '[name][extname]';
            if (asset.name?.endsWith('css')) return `styles/${format}`;
            return 'assets/[name][extname]';
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      coverage: {
        reportsDirectory: '../coverage',
      },
      setupFiles: ['../vitest.setup.ts'],
    },
    optimizeDeps: {
      exclude: ['path', 'fast-glob'],
    },
  };
});
