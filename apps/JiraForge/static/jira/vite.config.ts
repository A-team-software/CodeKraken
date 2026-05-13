import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { init, parse } from 'es-module-lexer';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appRoot = __dirname;
const uiRoot = path.resolve(appRoot, 'ui');
const distRoot = path.resolve(appRoot, '../../dist');

const ENTRY_FILES = ['index.ts', 'index.tsx', 'index.jsx', 'index.js'];

function walk(dirPath: string, visitor: (dir: string) => void) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const nextPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      visitor(nextPath);
      walk(nextPath, visitor);
    }
  }
}

function getEntryPoints(): Record<string, string> {
  const result: Record<string, string> = {};

  walk(uiRoot, (dir) => {
    const foundEntry = ENTRY_FILES.find((entryFile) =>
      fs.existsSync(path.join(dir, entryFile))
    );

    if (!foundEntry) {
      return;
    }

    const relativeDir = path.relative(uiRoot, dir);
    const entryName = relativeDir.split(path.sep).join('/');

    if (!entryName || entryName.startsWith('shared')) {
      return;
    }

    result[entryName] = path.join(dir, foundEntry);
  });

  return result;
}

function listFilesRecursive(root: string, extension: string): string[] {
  const files: string[] = [];

  function collect(current: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        collect(absolutePath);
      } else if (entry.isFile() && absolutePath.endsWith(extension)) {
        files.push(absolutePath);
      }
    }
  }

  if (fs.existsSync(root)) {
    collect(root);
  }

  return files;
}

function copyDirectoryRecursive(from: string, to: string) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const fromPath = path.join(from, entry.name);
    const toPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryRecursive(fromPath, toPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(fromPath, toPath);
    }
  }
}

function directoryHasFiles(dirPath: string): boolean {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return false;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const next = path.join(dirPath, entry.name);
    if (entry.isFile()) {
      return true;
    }
    if (entry.isDirectory() && directoryHasFiles(next)) {
      return true;
    }
  }

  return false;
}

function rewriteLocalImports(jsFilePath: string) {
  const original = fs.readFileSync(jsFilePath, 'utf8');
  const [imports] = parse(original);

  let updated = '';
  let cursor = 0;

  for (const item of imports) {
    const specifier = original.slice(item.s, item.e);
    if (!specifier.startsWith('../')) {
      continue;
    }

    const normalized = specifier.replace(/^(\.\.\/)+/, './');
    updated += original.slice(cursor, item.s);
    updated += normalized;
    cursor = item.e;
  }

  if (!updated) {
    return;
  }

  updated += original.slice(cursor);
  fs.writeFileSync(jsFilePath, updated, 'utf8');
}

function buildHtml(entryScript: string, cssFiles: string[], isDevMode: boolean) {
  const cssTags = cssFiles
    .map((fileName) => `  <link rel="stylesheet" href="./${fileName}" />`)
    .join('\n');

  const liveReloadSnippet = isDevMode
    ? [
        '<script>',
        '  // Lightweight live refresh for tunnel + watch during development.',
        '  setInterval(() => fetch(window.location.href, { method: "HEAD", cache: "no-store" })',
        '    .then(() => undefined)',
        '    .catch(() => undefined), 3000);',
        '</script>',
      ].join('\n')
    : '';

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="UTF-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    cssTags,
    '</head>',
    '<body>',
    '  <div id="root"></div>',
    `  <script type="module" src="./${entryScript}"></script>`,
    liveReloadSnippet,
    '</body>',
    '</html>',
    '',
  ]
    .filter(Boolean)
    .join('\n');
}

function getViteMajorVersion() {
  try {
    const require = createRequire(import.meta.url);
    const vitePackagePath = require.resolve('vite/package.json');
    const vitePackage = JSON.parse(fs.readFileSync(vitePackagePath, 'utf8')) as {
      version?: string;
    };
    const major = Number.parseInt((vitePackage.version ?? '0').split('.')[0], 10);
    return Number.isFinite(major) ? major : 0;
  } catch {
    return 0;
  }
}

function multiHtmlPlugin(entryPoints: Record<string, string>, isDevMode: boolean): Plugin {
  const entryTopSegments = new Set(
    Object.keys(entryPoints).map((entryName) => entryName.split('/')[0])
  );

  return {
    name: 'forge-multi-html',
    apply: 'build',
    async writeBundle() {
      await init;

      const rootEntries = fs.readdirSync(distRoot, { withFileTypes: true });
      const sharedRootFiles = rootEntries.filter(
        (entry) => entry.isFile() && /\.(js|css|map)$/.test(entry.name)
      );

      for (const entryName of Object.keys(entryPoints)) {
        const entryDir = path.join(distRoot, entryName);
        fs.mkdirSync(entryDir, { recursive: true });

        for (const sharedFile of sharedRootFiles) {
          const fromPath = path.join(distRoot, sharedFile.name);
          const toPath = path.join(entryDir, sharedFile.name);
          fs.copyFileSync(fromPath, toPath);
        }

        for (const rootEntry of rootEntries) {
          if (!rootEntry.isDirectory()) {
            continue;
          }

          const rootDirPath = path.join(distRoot, rootEntry.name);
          if (entryTopSegments.has(rootEntry.name)) {
            continue;
          }

          const destination = path.join(entryDir, rootEntry.name);
          copyDirectoryRecursive(rootDirPath, destination);
        }

        const jsFiles = listFilesRecursive(entryDir, '.js');
        for (const jsFile of jsFiles) {
          rewriteLocalImports(jsFile);
        }

        const localFiles = fs.readdirSync(entryDir);
        const entryScript =
          localFiles.find((fileName) => /^index-[A-Za-z0-9_-]+\.js$/.test(fileName)) ??
          localFiles.find((fileName) => fileName.endsWith('.js'));

        if (!entryScript) {
          throw new Error(`Missing entry script for ${entryName}`);
        }

        const cssFiles = localFiles.filter((fileName) => fileName.endsWith('.css')).sort();
        const html = buildHtml(entryScript, cssFiles, isDevMode);
        fs.writeFileSync(path.join(entryDir, 'index.html'), html, 'utf8');
      }

      for (const sharedFile of sharedRootFiles) {
        fs.rmSync(path.join(distRoot, sharedFile.name), { force: true });
      }
    },
  };
}

const entryPoints = getEntryPoints();
const isServeMode = process.env.SERVE_MODE === '1';
const isDevMode = process.env.DEV_MODE === '1';
const viteMajor = getViteMajorVersion();

const staticCopyTargets = [
  { src: path.resolve(uiRoot, 'locales/**/*'), dest: 'locales', rootDir: path.resolve(uiRoot, 'locales') },
  { src: path.resolve(uiRoot, 'assets/**/*'), dest: 'assets', rootDir: path.resolve(uiRoot, 'assets') },
  {
    src: path.resolve(uiRoot, 'shared/assets/**/*'),
    dest: 'assets',
    rootDir: path.resolve(uiRoot, 'shared/assets'),
  },
  { src: path.resolve(uiRoot, 'public/**/*'), dest: '.', rootDir: path.resolve(uiRoot, 'public') },
]
  .filter((target) => directoryHasFiles(target.rootDir))
  .map(({ src, dest }) => ({ src, dest }));

const outputOptions = {
  entryFileNames: '[name]/index-[hash].js',
  chunkFileNames: '[name]-[hash].js',
  assetFileNames: '[name]-[hash][extname]',
};

export default defineConfig({
  root: uiRoot,
  base: isServeMode ? '/' : './',
  esbuild: {
    loader: 'jsx',
    include: /ui\/shared\/.*\.js$/,
  },
  plugins: [
    react(),
    ...(staticCopyTargets.length > 0
      ? [
          viteStaticCopy({
            targets: staticCopyTargets,
            silent: true,
          }),
        ]
      : []),
    ...(isServeMode ? [] : [multiHtmlPlugin(entryPoints, isDevMode)]),
  ],
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  build: {
    outDir: distRoot,
    emptyOutDir: true,
    sourcemap: true,
    modulePreload: false,
    ...(viteMajor >= 8
      ? {
          rolldownOptions: {
            input: entryPoints,
            output: outputOptions,
          },
          legacy: {
            inconsistentCjsInterop: true,
          },
        }
      : {
          rollupOptions: {
            input: entryPoints,
            output: outputOptions,
          },
        }),
  },
});
