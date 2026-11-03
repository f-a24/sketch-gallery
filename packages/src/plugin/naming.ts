const SKETCH_EXT = /\.sketch\.[cm]?[jt]sx?$/;

function words(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_\-.]+/)
    .filter(Boolean);
}

/** 表示用の単語区切りにする（例 "WideAngle" → "Wide Angle"、"flow-field" → "Flow Field"） */
export function startCase(input: string): string {
  return words(input)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(' ');
}

/** id 用のケバブケースにする（例 "Three/Wide Angle" → "three-wide-angle"） */
export function kebab(input: string): string {
  return words(input.replace(/\//g, ' '))
    .map((w) => w.toLowerCase())
    .join('-');
}

/** ファイルパスからサイドバー階層を作る（例 "three/camera.sketch.ts" → "Three/Camera"） */
export function titleFromPath(relativePath: string): string {
  return relativePath
    .replace(/\\/g, '/')
    .replace(SKETCH_EXT, '')
    .split('/')
    .filter(Boolean)
    .map(startCase)
    .join('/');
}

/** Storybook 形式の id: "three-camera--wide-angle" */
export function sketchId(title: string, exportName: string): string {
  return `${kebab(title)}--${kebab(exportName)}`;
}
