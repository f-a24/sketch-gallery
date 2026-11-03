import type { SketchEntry } from '../types.ts';

export interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  sketches: SketchEntry[];
}

/** "/" 区切りの title でスケッチをグループ化する（入力順を保つ） */
export function buildTree(sketches: SketchEntry[]): TreeNode {
  const root: TreeNode = { name: '', path: '', children: [], sketches: [] };
  for (const sketch of sketches) {
    let node = root;
    for (const segment of sketch.title.split('/')) {
      const path = node.path ? `${node.path}/${segment}` : segment;
      let child = node.children.find((c) => c.name === segment);
      if (!child) {
        child = { name: segment, path, children: [], sketches: [] };
        node.children.push(child);
      }
      node = child;
    }
    node.sketches.push(sketch);
  }
  return root;
}

export function matches(sketch: SketchEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${sketch.title} ${sketch.name} ${sketch.id}`.toLowerCase().includes(q);
}
