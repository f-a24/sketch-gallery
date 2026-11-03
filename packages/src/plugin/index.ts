import { readFile } from 'node:fs/promises';
import path from 'node:path';
import picomatch from 'picomatch';
import { glob } from 'tinyglobby';
import type { Plugin, ViteDevServer } from 'vite';
import { sketchId, startCase, titleFromPath } from './naming.ts';
import { scanExports } from './scan.ts';

export interface SketchGalleryOptions {
  /** スケッチを置くディレクトリ（Vite root からの相対）。既定は "src/sketches" */
  dir?: string;
  /** `dir` からの相対 glob。既定は "**\/*.sketch.{ts,js}" */
  include?: string | string[];
}

const VIRTUAL_ID = 'virtual:sketch-gallery/sketches';
const RESOLVED_ID = '\0' + VIRTUAL_ID;
const HMR_EVENT = 'sketch-gallery:hmr';

const toPosix = (p: string) => p.replace(/\\/g, '/');

/** スケッチ一覧の仮想モジュールを無効化して、ページ全体を再読み込みさせる */
function reloadIndex(server: ViteDevServer) {
  const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
  if (mod) server.moduleGraph.invalidateModule(mod);
  server.ws.send({ type: 'full-reload' });
}

export default function sketchGallery(options: SketchGalleryOptions = {}): Plugin {
  const include = options.include ?? '**/*.sketch.{ts,js}';
  const isMatch = picomatch(include);

  let root = process.cwd();
  let dir = '';
  let isServe = false;
  /** 絶対パス（posix）→ 名前付き export */
  const exportsCache = new Map<string, string[]>();

  const relToDir = (abs: string) => toPosix(path.relative(dir, abs));
  const isSketchFile = (abs: string) => {
    const rel = relToDir(abs);
    return !rel.startsWith('..') && !path.isAbsolute(rel) && isMatch(rel);
  };

  async function refresh(abs: string): Promise<boolean> {
    const key = toPosix(abs);
    // readFile の失敗（保存直後の削除・リネームなど）も同じく拾う
    const names = await readFile(abs, 'utf8')
      .then((code) => scanExports(code, abs))
      .catch((error) => {
        console.warn(`[sketch-gallery] failed to scan ${key}:`, error);
        return exportsCache.get(key) ?? [];
      });
    const before = exportsCache.get(key);
    exportsCache.set(key, names);
    return before?.join() !== names.join();
  }

  async function scanAll() {
    const files = await glob(include, { cwd: dir, absolute: true });
    exportsCache.clear();
    await Promise.all(files.map(refresh));
  }

  function generateModule(): string {
    const entries = [...exportsCache.entries()]
      .map(([abs, names]) => ({ abs, names, title: titleFromPath(relToDir(abs)) }))
      .toSorted((a, b) => a.title.localeCompare(b.title));

    /** id → 最初にその id を使ったファイルと export */
    const seen = new Map<string, string>();
    const lines = entries.flatMap(({ abs, names, title }) => {
      const file = '/' + toPosix(path.relative(root, abs));
      return names.map((exportName) => {
        const id = sketchId(title, exportName);
        const where = `${file}#${exportName}`;
        const first = seen.get(id);
        // 同じ id だと先に見つかった方しか開けないので、気づけるように警告する
        if (first)
          console.warn(`[sketch-gallery] duplicate sketch id "${id}": ${first} and ${where}`);
        else seen.set(id, where);
        return (
          `  { id: ${JSON.stringify(id)}, title: ${JSON.stringify(title)}, ` +
          `name: ${JSON.stringify(startCase(exportName))}, exportName: ${JSON.stringify(exportName)}, ` +
          `file: ${JSON.stringify(file)}, load: () => import(${JSON.stringify(file)}) },`
        );
      });
    });
    return `export const sketches = [\n${lines.join('\n')}\n];\n`;
  }

  const main: Plugin = {
    name: 'sketch-gallery',

    config(config) {
      const base = path.resolve(config.root ?? process.cwd());
      return {
        build: {
          rolldownOptions: {
            input: {
              main: path.join(base, 'index.html'),
              preview: path.join(base, 'preview.html'),
            },
          },
        },
      };
    },

    configResolved(config) {
      root = config.root;
      isServe = config.command === 'serve';
      dir = path.resolve(root, options.dir ?? 'src/sketches');
    },

    async buildStart() {
      await scanAll();
    },

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },

    load(id) {
      if (id === RESOLVED_ID) return generateModule();
    },

    transform(code, id) {
      const file = id.split('?')[0]!;
      if (!isServe || !isSketchFile(file)) return;
      const key = '/' + toPosix(path.relative(root, file));
      // 自己 accept させて、スケッチ（とその import 先）の編集時にその場で再マウントする
      return {
        code:
          code +
          `\nif (import.meta.hot) {\n` +
          `  import.meta.hot.accept((mod) => {\n` +
          `    if (mod) window.dispatchEvent(new CustomEvent(${JSON.stringify(HMR_EVENT)}, { detail: { file: ${JSON.stringify(key)}, mod } }));\n` +
          `  });\n` +
          `}\n`,
        map: null,
      };
    },

    configureServer(server) {
      const onAddOrUnlink = async (file: string, removed: boolean) => {
        if (!isSketchFile(file)) return;
        if (removed) exportsCache.delete(toPosix(file));
        else await refresh(file);
        reloadIndex(server);
      };
      server.watcher.on('add', (file) => onAddOrUnlink(file, false));
      server.watcher.on('unlink', (file) => onAddOrUnlink(file, true));
      server.watcher.on('change', async (file) => {
        if (isSketchFile(file) && (await refresh(file))) reloadIndex(server);
      });
    },
  };

  return main;
}
