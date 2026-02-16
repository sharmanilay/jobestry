import { withPageConfig } from './index.js';
import { IS_DEV } from '@extension/env';
import { makeEntryPointPlugin } from '@extension/hmr';
import { build as buildTW } from 'tailwindcss/lib/cli/build/index.js';
import { build } from 'vite';
import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

interface IContentBuilderProps {
  matchesDir: string;
  srcDir: string;
  rootDir: string;
  contentName: 'content' | 'content-ui' | 'content-runtime';
  withTw: boolean;
}

type BuilderPropsType = Omit<IContentBuilderProps, 'withTw'>;

const getContentScriptEntries = (matchesDir: string) => {
  const entryPoints: Record<string, string> = {};
  const entries = readdirSync(matchesDir);

  entries.forEach((folder: string) => {
    const filePath = resolve(matchesDir, folder);
    const isFolder = statSync(filePath).isDirectory();
    const entriesInFolder = readdirSync(filePath);
    const haveConfigTsFile = entriesInFolder.includes('config.ts');
    const haveIndexTsxFile = entriesInFolder.includes('index.tsx');
    const haveIndexTsFile = entriesInFolder.includes('index.ts');

    if (isFolder && !(haveConfigTsFile || haveIndexTsFile || haveIndexTsxFile)) {
      throw new Error(`${folder} in \`matches\` doesn't have index.ts or index.tsx file`);
    } else {
      const entry = haveConfigTsFile ? 'config.ts' : haveIndexTsFile ? 'index.ts' : 'index.tsx';
      entryPoints[folder] = resolve(filePath, entry);
    }
  });

  return entryPoints;
};

const configsBuilder = ({ matchesDir, srcDir, rootDir, contentName }: BuilderPropsType) =>
  Object.entries(getContentScriptEntries(matchesDir)).map(([name, entry]) => ({
    name,
    config: withPageConfig({
      mode: IS_DEV ? 'development' : undefined,
      resolve: {
        alias: {
          '@src': srcDir,
        },
      },
      publicDir: resolve(rootDir, 'public'),
      plugins: [IS_DEV && contentName !== 'content-ui' ? makeEntryPointPlugin() : false],
      build: {
        lib: {
          name: name,
          formats: ['iife'],
          entry,
          fileName: name,
        },
        outDir: resolve(rootDir, '..', '..', 'dist', contentName),
      },
    }),
  }));

const builds = async ({ srcDir, contentName, rootDir, matchesDir, withTw }: IContentBuilderProps) =>
  configsBuilder({ matchesDir, srcDir, rootDir, contentName }).map(async ({ name, config }) => {
    if (withTw) {
      const folder = resolve(matchesDir, name);
      const args = {
        ['--input']: resolve(folder, 'index.css'),
        ['--output']: resolve(rootDir, 'dist', name, 'index.css'),
        ['--config']: resolve(rootDir, 'tailwind.config.ts'),
        ['--watch']: IS_DEV,
      };

      await buildTW(args);
    }

    //@ts-expect-error This is hidden property from vite's resolveConfig()
    config.configFile = false;
    return build(config);
  });

/**
 * Standard content script builder for all content scripts.
 * This builder handles content, content-ui, and content-runtime scripts.
 * It supports Tailwind CSS compilation and generates IIFE bundles.
 */
export const contentBuilder = async ({
  matchesDir,
  srcDir,
  rootDir,
  contentName,
  withTw = true,
}: IContentBuilderProps) =>
  builds({
    srcDir,
    contentName,
    rootDir,
    matchesDir,
    withTw,
  });
