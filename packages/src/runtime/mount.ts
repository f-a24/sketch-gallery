import type {
  Args,
  Cleanup,
  Context,
  FrameInfo,
  Sketch,
  SketchExport,
  SketchParameters,
  SizeInfo,
} from '../types.ts';

export interface MountOptions<A extends Args = Args> {
  /** `sketch.args` を上書きする（再マウントをまたいで Controls の値を保つためなど） */
  args?: A;
  onError?: (error: unknown) => void;
}

export interface MountHandle<A extends Args = Args> {
  /**
   * スケッチが `ctx.onArgs` を登録していれば新しい args をライブで反映する。
   * 登録がなければ false を返すので、呼び出し側で再マウントする。
   */
  update(args: A): boolean;
  unmount(): void;
}

type GL = WebGLRenderingContext | WebGL2RenderingContext;

/** `canvas` で作られた WebGL コンテキストを記録し、アンマウント時に解放できるようにする */
function trackGLContexts(canvas: HTMLCanvasElement): GL[] {
  const contexts: GL[] = [];
  const getContext = canvas.getContext.bind(canvas) as (
    id: string,
    options?: unknown,
  ) => RenderingContext | null;
  canvas.getContext = ((id: string, options?: unknown) => {
    const context = getContext(id, options);
    if (
      context &&
      (id === 'webgl' || id === 'webgl2' || id === 'experimental-webgl') &&
      !contexts.includes(context as GL)
    ) {
      contexts.push(context as GL);
    }
    return context;
  }) as HTMLCanvasElement['getContext'];
  return contexts;
}

const MAX_DELTA = 0.1;

export function normalizeSketch(value: unknown): Sketch | null {
  if (typeof value === 'function') return { render: value as Sketch['render'] };
  if (value && typeof value === 'object' && typeof (value as Sketch).render === 'function') {
    return value as Sketch;
  }
  return null;
}

function resolvePixelRatio(setting: SketchParameters['pixelRatio']): number {
  const dpr = globalThis.devicePixelRatio || 1;
  if (typeof setting === 'number') return setting;
  const [min, max] = setting ?? [1, 2];
  return Math.min(Math.max(dpr, min), max);
}

/**
 * スケッチを `container` にマウントする。canvas・フレームループ・リサイズを管理し、
 * スケッチの後始末が必ず 1 回だけ呼ばれることを保証する。
 */
export function mount<A extends Args>(
  sketchExport: SketchExport<A>,
  container: HTMLElement,
  options: MountOptions<A> = {},
): MountHandle<A> {
  const sketch = normalizeSketch(sketchExport) as Sketch<A> | null;
  if (!sketch) throw new TypeError('Sketch export must be a function or an object with render()');

  const params = sketch.parameters ?? {};
  const frameloop = params.frameloop ?? 'always';
  const controller = new AbortController();
  const frameCallbacks: ((f: FrameInfo) => void)[] = [];
  const resizeCallbacks: ((s: SizeInfo) => void)[] = [];
  const argsCallbacks: ((args: Readonly<A>, prev: Readonly<A>) => void)[] = [];
  let args = Object.freeze({ ...(options.args ?? sketch.args) }) as A;

  let cleanup: Cleanup | undefined;
  let rafId = 0;
  let needsFrame = frameloop !== 'never';
  let ready = false;
  let disposed = false;

  const canvas = document.createElement('canvas');
  const glContexts = trackGLContexts(canvas);
  if (params.canvas !== false) {
    canvas.style.cssText = 'display:block;width:100%;height:100%;';
    container.append(canvas);
  }
  if (params.background) container.style.background = params.background;

  const size: SizeInfo = { width: 0, height: 0, pixelRatio: 1 };
  const measure = () => {
    const rect = container.getBoundingClientRect();
    size.width = Math.max(1, Math.round(rect.width));
    size.height = Math.max(1, Math.round(rect.height));
    size.pixelRatio = resolvePixelRatio(params.pixelRatio);
    if (params.canvas !== false) {
      // canvas.width は同じ値を代入しても内容が消えるので、変わったときだけ代入する
      const w = Math.round(size.width * size.pixelRatio);
      const h = Math.round(size.height * size.pixelRatio);
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
    }
  };
  measure();

  const fail = (error: unknown) => {
    if (disposed) return;
    console.error('[sketch-gallery]', error);
    handle.unmount();
    options.onError?.(error);
  };

  const ctx: Context<A> = {
    canvas,
    container,
    get args() {
      return args;
    },
    onArgs: (cb) => {
      argsCallbacks.push(cb);
    },
    get width() {
      return size.width;
    },
    get height() {
      return size.height;
    },
    get pixelRatio() {
      return size.pixelRatio;
    },
    onFrame: (cb) => {
      frameCallbacks.push(cb);
    },
    onResize: (cb) => {
      resizeCallbacks.push(cb);
    },
    invalidate: () => {
      needsFrame = true;
    },
    signal: controller.signal,
  };

  let time = 0;
  let frame = 0;
  let last = performance.now();
  const tick = (now: number) => {
    rafId = requestAnimationFrame(tick);
    const delta = Math.min((now - last) / 1000, MAX_DELTA);
    last = now;
    time += delta;
    if (!ready || !needsFrame) return;
    if (frameloop !== 'always') needsFrame = false;
    const info: FrameInfo = { time, delta, frame: frame++ };
    try {
      for (const cb of frameCallbacks) cb(info);
    } catch (error) {
      fail(error);
    }
  };

  const observer = new ResizeObserver(() => {
    const prev = `${size.width}x${size.height}@${size.pixelRatio}`;
    measure();
    if (!ready || prev === `${size.width}x${size.height}@${size.pixelRatio}`) return;
    try {
      for (const cb of resizeCallbacks) cb({ ...size });
    } catch (error) {
      fail(error);
    }
    if (frameloop === 'demand') needsFrame = true;
  });

  const handle: MountHandle<A> = {
    update(next) {
      if (disposed || !ready || argsCallbacks.length === 0) return false;
      const prev = args;
      args = Object.freeze({ ...next });
      try {
        for (const cb of argsCallbacks) cb(args, prev);
      } catch (error) {
        fail(error);
      }
      needsFrame = frameloop !== 'never' || needsFrame;
      return true;
    },
    unmount() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      cancelAnimationFrame(rafId);
      observer.disconnect();
      try {
        cleanup?.();
      } catch (error) {
        console.error('[sketch-gallery] cleanup failed', error);
      }
      // ブラウザの WebGL コンテキスト数には上限（16 前後）があるので、GC を待たずに解放する
      for (const gl of glContexts) gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    },
  };

  const start = (result: void | Cleanup) => {
    if (typeof result === 'function') cleanup = result;
    if (disposed) {
      // 非同期 render の完了前にアンマウントされた
      cleanup?.();
      for (const gl of glContexts) gl.getExtension('WEBGL_lose_context')?.loseContext();
      return;
    }
    ready = true;
    observer.observe(container);
    if (frameloop !== 'never') rafId = requestAnimationFrame(tick);
  };

  try {
    const result = sketch.render(ctx);
    if (result instanceof Promise) result.then(start, fail);
    else start(result);
  } catch (error) {
    fail(error);
  }

  return handle;
}
