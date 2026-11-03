import type { Meta, Sketch } from 'sketch-gallery';
import { cameraFunction, type CameraArgs } from './cameraFunction';

export default {
  tags: ['three', 'camera'],
} satisfies Meta;

export const Camera = {
  render: cameraFunction,
};

export const WideAngle: Sketch<CameraArgs> = {
  render: cameraFunction,
  args: { fov: 100, speed: 2 },
  argTypes: { fov: { min: 10, max: 120 } },
};
