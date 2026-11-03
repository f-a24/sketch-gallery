import { Pane } from 'tweakpane';
import type { ArgTypes, Args } from '../types.ts';
import { bindingParams, cloneArgs } from './args.ts';

export interface ControlsOptions<A extends Args> {
  /** 最初に表示する値 */
  args: A;
  /** Reset ボタンで戻す値 */
  defaults: A;
  argTypes?: ArgTypes<A>;
  /** スライダーをドラッグ中は `last` が false */
  onChange: (args: A, last: boolean) => void;
}

export interface Controls {
  dispose(): void;
}

export function createControls<A extends Args>(options: ControlsOptions<A>): Controls {
  const state = cloneArgs(options.args) as Args;
  const container = document.createElement('div');
  container.className = 'cg-controls';
  document.body.append(container);

  const pane = new Pane({
    container,
    title: 'Controls',
    // preview の iframe 内で判定するので、ウィンドウではなくキャンバス領域の幅になる
    expanded: matchMedia('(min-width: 481px)').matches,
  });

  const argTypes = (options.argTypes ?? {}) as Record<string, ArgTypes[string]>;
  for (const key of Object.keys(state)) {
    const params = bindingParams(key, state[key], argTypes[key]);
    if (!params) continue;
    try {
      pane.addBinding(state, key, params);
    } catch (error) {
      console.warn(`[sketch-gallery] no control for arg "${key}"`, error);
    }
  }

  let muted = false;
  pane.on('change', (event) => {
    if (!muted) options.onChange(cloneArgs(state) as A, event.last);
  });

  pane.addBlade({ view: 'separator' });
  pane.addButton({ title: 'Reset' }).on('click', () => {
    muted = true;
    Object.assign(state, cloneArgs(options.defaults));
    pane.refresh();
    muted = false;
    options.onChange(cloneArgs(state) as A, true);
  });

  return {
    dispose() {
      pane.dispose();
      container.remove();
    },
  };
}
