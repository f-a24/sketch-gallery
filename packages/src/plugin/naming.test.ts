import { describe, expect, test } from 'bun:test';
import { kebab, sketchId, startCase, titleFromPath } from './naming.ts';

describe('naming', () => {
  test('startCase', () => {
    expect(startCase('WideAngle')).toBe('Wide Angle');
    expect(startCase('flow-field')).toBe('Flow Field');
    expect(startCase('camera')).toBe('Camera');
  });

  test('kebab', () => {
    expect(kebab('Three/Wide Angle')).toBe('three-wide-angle');
    expect(kebab('WideAngle')).toBe('wide-angle');
  });

  test('titleFromPath', () => {
    expect(titleFromPath('three/camera.sketch.ts')).toBe('Three/Camera');
    expect(titleFromPath('canvas2d\\flow-field.sketch.js')).toBe('Canvas2d/Flow Field');
  });

  test('sketchId', () => {
    expect(sketchId('Three/Camera', 'WideAngle')).toBe('three-camera--wide-angle');
  });
});
