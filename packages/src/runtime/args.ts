import { startCase } from '../plugin/naming.ts';
import type { ArgType, Args } from '../types.ts';

const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * 1 つの arg を Tweakpane のバインディング設定に変換する。コントロールを出さないなら null。
 * 値の型からコントロールを推論し、argTypes で調整する。
 */
export function bindingParams(
  key: string,
  value: unknown,
  type: ArgType = {},
): Record<string, unknown> | null {
  if (
    type.control === false ||
    value === null ||
    value === undefined ||
    typeof value === 'function'
  )
    return null;

  const params: Record<string, unknown> = { label: type.label ?? startCase(key) };
  if (type.options) {
    params.options = Array.isArray(type.options)
      ? type.options.map((v) => ({ text: String(v), value: v }))
      : type.options;
    return params;
  }
  if (typeof value === 'number') {
    if (type.min !== undefined) params.min = type.min;
    if (type.max !== undefined) params.max = type.max;
    if (type.step !== undefined) params.step = type.step;
  }
  if (typeof value === 'string' && (type.control === 'color' || HEX_COLOR.test(value))) {
    params.view = 'color';
  }
  return params;
}

export function cloneArgs<A extends Args>(args: A): A {
  try {
    return structuredClone(args);
  } catch {
    return { ...args };
  }
}

/** `defaults` に同じキー・同じ型がある `previous` の値を引き継ぐ（HMR をまたぐときに使う） */
export function mergeArgs<A extends Args>(defaults: A, previous: Args): A {
  const merged = cloneArgs(defaults) as Args;
  for (const key of Object.keys(merged)) {
    if (key in previous && typeof previous[key] === typeof merged[key]) merged[key] = previous[key];
  }
  return merged as A;
}
