type Child = Node | string | null | undefined | false;
type Props = Record<string, unknown>;

/**
 * 要素を作る小さなヘルパー。
 * - `on*` に関数を渡すとイベントリスナーとして登録する
 * - null / undefined / false の属性は付けない、true は空文字の属性にする
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2), value as EventListener);
    } else if (key === 'class') {
      el.className = String(value);
    } else {
      el.setAttribute(key, value === true ? '' : String(value));
    }
  }
  el.append(...children.filter((c): c is Node | string => c != null && c !== false));
  return el;
}
