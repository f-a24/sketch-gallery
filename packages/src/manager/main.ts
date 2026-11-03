import { sketches } from 'virtual:sketch-gallery/sketches';
import type { SketchEntry } from '../types.ts';
import { h } from './dom.ts';
import { buildTree, matches, type TreeNode } from './tree.ts';
import './manager.css';

const readHash = () => decodeURIComponent(location.hash.replace(/^#\/?/, ''));
const findCurrent = () => sketches.find((s) => s.id === readHash()) ?? sketches[0];
const previewUrl = (entry: SketchEntry) => `preview.html?id=${encodeURIComponent(entry.id)}`;

const target = document.getElementById('sketch-gallery-app') ?? document.body;

let query = '';
let current = findCurrent();

// ---- サイドバー ----

const search = h('input', {
  type: 'search',
  placeholder: 'Search',
  'aria-label': 'Search sketches',
  oninput: () => {
    query = search.value;
    renderTree();
  },
});
const tree = h('ul', { class: 'cg-tree' });
const noMatch = h('p', { class: 'cg-empty', hidden: true }, 'No sketches');
const sidebar = h(
  'nav',
  { class: 'cg-sidebar', 'aria-label': 'Sketches' },
  h('header', {}, h('h1', {}, 'sketch-gallery'), search),
  tree,
  noMatch,
);

function branch(node: TreeNode, depth: number): HTMLElement[] {
  return node.children.map((child) =>
    h(
      'li',
      {},
      h('span', { class: 'cg-group', style: `--depth: ${depth}` }, child.name),
      h(
        'ul',
        {},
        ...child.sketches.map((sketch) =>
          h(
            'li',
            {},
            h(
              'a',
              {
                href: `#/${sketch.id}`,
                class: 'cg-link',
                style: `--depth: ${depth + 1}`,
                'data-id': sketch.id,
                'aria-current': sketch.id === current?.id ? 'page' : null,
              },
              sketch.name,
            ),
          ),
        ),
        ...branch(child, depth + 1),
      ),
    ),
  );
}

function renderTree() {
  const root = buildTree(sketches.filter((s) => matches(s, query)));
  tree.replaceChildren(...branch(root, 0));
  noMatch.hidden = root.children.length > 0;
}

/** 選択中のリンクだけ更新する（作り直すとクリックしたリンクのフォーカスが失われるため） */
function markCurrent() {
  for (const link of tree.querySelectorAll<HTMLAnchorElement>('a[data-id]')) {
    if (link.dataset.id === current?.id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

// ---- ステージ（プレビューとツールバー） ----

const stage = h('main', { class: 'cg-stage' });
const layout = h('div', { class: 'cg-layout' }, sidebar, stage);
target.append(layout);
renderTree();

if (!current) {
  stage.append(
    h('p', { class: 'cg-empty' }, 'Add a ', h('code', {}, '*.sketch.ts'), ' file to get started.'),
  );
} else {
  const iframe = h('iframe', {});
  const caption = h('span', { class: 'cg-caption' });
  const menuToggle = h(
    'button',
    {
      class: 'cg-menu-toggle',
      'aria-expanded': 'false',
      onclick: () => setMenu(!layout.classList.contains('cg-menu-open')),
    },
    'Menu',
  );
  const openLink = h('a', { class: 'cg-button', target: '_blank', rel: 'noopener' }, 'Open ↗');
  const toolbar = h('div', { class: 'cg-toolbar' }, menuToggle, caption, openLink);
  stage.append(iframe, toolbar);

  function setMenu(open: boolean) {
    layout.classList.toggle('cg-menu-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
  }

  function update() {
    current = findCurrent();
    if (!current) return;
    const src = previewUrl(current);
    // src が変わったときだけ iframe を読み直す（スケッチごとに環境を作り直して分離するため）
    if (iframe.getAttribute('src') !== src) iframe.src = src;
    iframe.title = caption.textContent = `${current.title} / ${current.name}`;
    openLink.href = src;
    markCurrent();
  }

  window.addEventListener('hashchange', () => {
    setMenu(false);
    update();
  });
  update();
}
