import { resolve } from 'node:path';
import { contentBuilder } from '@extension/vite-config';

const rootDir = resolve(import.meta.dirname);
const srcDir = resolve(rootDir, 'src');
const matchesDir = resolve(srcDir, 'matches');

await Promise.all(
  await contentBuilder({
    matchesDir,
    srcDir,
    rootDir,
    contentName: 'content-runtime',
    withTw: true,
  }),
);
