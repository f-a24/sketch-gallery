import { expect, test } from 'bun:test';
import { scanExports } from './scan.ts';

test('scanExports lists value exports only', async () => {
  const code = `
    import type { Meta, Sketch } from 'sketch-gallery';
    export type Args = { fov: number };
    export interface Foo<T extends string> { a: T }
    export default { tags: ['x'] } satisfies Meta;
    export const Camera: Sketch<Args> = { render: (ctx) => {} };
    export function Particles(ctx: unknown): void {}
    const Hidden = 1;
    export { Hidden as Renamed };
  `;
  expect(await scanExports(code, 'x.sketch.ts')).toEqual(['Camera', 'Particles', 'Renamed']);
});
