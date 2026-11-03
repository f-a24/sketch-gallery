export type Args = Record<string, unknown>;

export type Cleanup = () => void;

export interface ArgType {
  min?: number;
  max?: number;
  step?: number;
  /** ドロップダウンにする。オブジェクトなら「表示名 → 値」の対応 */
  options?: readonly unknown[] | Record<string, unknown>;
  label?: string;
  /** "color" でカラーピッカーを強制（#hex 文字列は自動判定）。false でコントロールを出さない */
  control?: 'color' | false;
}

export type ArgTypes<A extends Args = Args> = { [K in keyof A]?: ArgType };

export interface Meta {
  /** サイドバー上の階層（例 "Three/Camera"）。省略時はファイルパスから生成（MVP ではまだ読み取らない） */
  title?: string;
  tags?: string[];
  description?: string;
}

export interface FrameInfo {
  /** マウントからの経過秒数。タブが非表示の間は止まる */
  time: number;
  /** 前フレームからの経過秒数。大きく飛ばないよう上限あり */
  delta: number;
  frame: number;
}

export interface SizeInfo {
  /** CSS ピクセル */
  width: number;
  height: number;
  pixelRatio: number;
}

export interface Context<A extends Args = Args> extends SizeInfo {
  /** マウントごとに新しく作る canvas。width * pixelRatio にサイズ設定済み */
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  /** 現在の args（ライブ更新後も常に最新値） */
  readonly args: Readonly<A>;
  /**
   * ライブ更新を有効にする。登録するとコントロール変更時に再マウントせず `cb` を呼ぶ。
   * 未登録なら後始末してから render し直す。
   */
  onArgs(cb: (args: Readonly<A>, prev: Readonly<A>) => void): void;
  onFrame(cb: (frame: FrameInfo) => void): void;
  onResize(cb: (size: SizeInfo) => void): void;
  /** `frameloop` が "demand" のとき 1 フレームの描画を要求する */
  invalidate(): void;
  /** アンマウント時（HMR・ページ移動・エラー）に abort される */
  signal: AbortSignal;
}

export type RenderFn<A extends Args = Args> = (
  ctx: Context<A>,
) => void | Cleanup | Promise<void | Cleanup>;

export interface SketchParameters {
  /** "always": 毎フレーム / "demand": invalidate()・リサイズ後のみ / "never": ループなし */
  frameloop?: 'always' | 'demand' | 'never';
  /** 固定値、または devicePixelRatio を [min, max] で制限。既定は [1, 2] */
  pixelRatio?: number | [min: number, max: number];
  /** false: canvas を作らない。ctx.container に自分で描く（p5.js など） */
  canvas?: boolean;
  background?: string;
}

export interface Sketch<A extends Args = Args> {
  render: RenderFn<A>;
  name?: string;
  args?: A;
  argTypes?: ArgTypes<A>;
  parameters?: SketchParameters;
}

/** `*.sketch.ts` の名前付き export として書けるもの */
export type SketchExport<A extends Args = Args> = Sketch<A> | RenderFn<A>;

/** Vite plugin がスケッチを import せずに静的に取り出す情報 */
export interface SketchEntry {
  id: string;
  /** サイドバー上の階層（例 "Three/Camera"） */
  title: string;
  /** 表示名（例 "Wide Angle"） */
  name: string;
  exportName: string;
  /** Vite root からのパス（例 "/src/sketches/three/camera.sketch.ts"） */
  file: string;
  load: () => Promise<Record<string, unknown>>;
}
