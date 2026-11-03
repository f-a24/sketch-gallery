import { sketches } from 'virtual:sketch-gallery/sketches';
import type { Args, Sketch, SketchEntry } from '../types.ts';
import { mergeArgs } from './args.ts';
import type { Controls } from './controls.ts';
import { mount, normalizeSketch, type MountHandle } from './mount.ts';
import './preview.css';

const HMR_EVENT = 'sketch-gallery:hmr';

const root = document.getElementById('sketch-gallery-root') ?? document.body;
const id = new URLSearchParams(location.search).get('id');
const entry = sketches.find((s) => s.id === id) ?? (id ? undefined : sketches[0]);

// manager 内に埋め込まれているときはツールバー分の余白を空ける
document.documentElement.classList.toggle('cg-embedded', window.parent !== window);

let sketch: Sketch | undefined;
let args: Args = {};
let current: MountHandle | undefined;
let controls: Controls | undefined;
let overlay: HTMLElement | undefined;

function showError(error: unknown) {
  overlay?.remove();
  overlay = document.createElement('pre');
  overlay.className = 'cg-error';
  overlay.textContent =
    error instanceof Error ? `${error.message}\n\n${error.stack ?? ''}` : String(error);
  document.body.append(overlay);
}

function remount() {
  current?.unmount();
  current = undefined;
  overlay?.remove();
  root.style.background = '';
  if (!sketch) return;
  try {
    current = mount(sketch, root, { args, onError: showError });
  } catch (error) {
    showError(error);
  }
}

async function setupControls() {
  controls?.dispose();
  controls = undefined;
  const target = sketch;
  if (!target?.args || Object.keys(target.args).length === 0) return;

  const { createControls } = await import('./controls.ts');
  if (target !== sketch) return; // 読み込み中に HMR で差し替わった
  controls = createControls({
    args,
    defaults: target.args,
    argTypes: target.argTypes,
    onChange(next, last) {
      args = next;
      // スケッチが onArgs を登録していればライブ更新、なければドラッグ終了時に再マウント
      if (!current?.update(next) && last) remount();
    },
  });
}

function mountModule(target: SketchEntry, mod: Record<string, unknown>) {
  const next = normalizeSketch(mod[target.exportName]);
  if (!next) {
    // 古いスケッチと Controls を残すと、パネル操作で古いスケッチが再マウントされてしまう
    sketch = undefined;
    current?.unmount();
    current = undefined;
    controls?.dispose();
    controls = undefined;
    showError(
      new Error(
        `"${target.exportName}" in ${target.file} is not a sketch (expected a function or { render })`,
      ),
    );
    return;
  }
  document.title = `${target.title} / ${target.name}`;
  sketch = next;
  args = mergeArgs(next.args ?? {}, args);
  remount();
  setupControls().catch(showError);
}

if (!entry) {
  showError(new Error(id ? `Sketch "${id}" not found` : 'No sketches found'));
} else {
  entry.load().then((mod) => mountModule(entry, mod), showError);

  // スケッチモジュールは自己 accept し（Vite plugin が注入）、このイベントを発火する
  window.addEventListener(HMR_EVENT, (event) => {
    const { file, mod } = (event as CustomEvent<{ file: string; mod: Record<string, unknown> }>)
      .detail;
    if (file === entry.file) mountModule(entry, mod);
  });
}

window.addEventListener('pagehide', () => {
  current?.unmount();
  controls?.dispose();
});
