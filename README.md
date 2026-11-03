# sketch-gallery

Canvas のスケッチ（WebGL / Canvas2D など）をストーリー形式で書いて、
サンプル一覧のようなギャラリーサイトを作るためのツール。

```ts
// examples/src/sketches/three/camera.sketch.ts
import { cameraFunction } from './cameraFunction';

export const Camera = {
  render: cameraFunction,
};
```

## コマンド

```bash
bun install
bun run dev        # http://localhost:5173
bun run build      # examples/dist に静的サイトを出力
bun run lint       # oxlint（--fix 付きは lint:fix）
bun run format     # bun fmt で整形（確認だけなら format:check）
```

- 整形は Bun 標準の `bun fmt`（設定は `bunfig.toml` の `[fmt]`）
- lint は当面 oxlint（設定は `.oxlintrc.json`）。`bun lint` が安定版に入ったら移行する。`bun lint` は oxlint の設定をそのまま読める
- `bun fmt` は `fmt` という名前のスクリプトがあるとそちらを実行するため、スクリプト名は `format` にしている

## 構成

- `packages` — フレームワーク本体（型・ランタイム・manager UI・Vite plugin）。UI は素の TypeScript + DOM
- `examples` — 個人用のスケッチ置き場。`sketch-gallery` 以外のフレームワーク内部は import しない

## スケッチの書き方

- ファイルパスがサイドバーの階層になる：`three/camera.sketch.ts` → `Three/Camera`
- 名前付き export 1 つが 1 スケッチ。`render` 関数そのもの、または `{ render, args, parameters }`
- `render(ctx)` にはサイズ設定済みの新しい `ctx.canvas` が渡る。後始末の関数を返してよい
- 自前の `requestAnimationFrame` やリサイズ監視の代わりに `ctx.onFrame` / `ctx.onResize` を使う
- Three.js では `renderer.setSize(w, h, false)` とする（CSS サイズはフレームワークが管理する）
- `parameters.frameloop`：`'always'`（既定）/ `'demand'`（`ctx.invalidate()` 後のみ）/ `'never'`

## Controls

`args` を書くと Tweakpane のパネルが自動で付く（数値・真偽値・文字列・`#hex` の色・`{ x, y }` のポイント）。
`argTypes` で `min` / `max` / `step`、`options`、`label`、`control: 'color' | false` を指定して調整できる。

- 既定：値を変えると後始末してから render し直す（スライダーは離したとき）
- ライブ更新：`ctx.onArgs((args, prev) => ...)` を登録すると、作り直さずその場で反映する。`ctx.args` は常に最新値
- 名前と型が同じ arg は、HMR をまたいでも値が保たれる
- `ctx.canvas` で作られた WebGL コンテキストは、アンマウント時にフレームワークが解放する

## 開発時の注意

plugin 自体（`packages/src/plugin`）を編集したときは、開発サーバーを再起動すること。
