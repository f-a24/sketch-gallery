import * as THREE from 'three';
import type { RenderFn } from 'sketch-gallery';

export type CameraArgs = { fov: number; speed: number };

export const cameraFunction: RenderFn<CameraArgs> = (ctx) => {
  const { fov = 50 } = ctx.args;

  const renderer = new THREE.WebGLRenderer({ canvas: ctx.canvas, antialias: true });
  renderer.setPixelRatio(ctx.pixelRatio);
  renderer.setSize(ctx.width, ctx.height, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0d12);
  scene.fog = new THREE.Fog(0x0b0d12, 8, 30);

  const camera = new THREE.PerspectiveCamera(fov, ctx.width / ctx.height, 0.1, 100);

  const geometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
  const material = new THREE.MeshStandardMaterial({
    color: 0x4fc3f7,
    roughness: 0.4,
    metalness: 0.2,
  });
  const grid = new THREE.Group();
  for (let x = -6; x <= 6; x += 1.5) {
    for (let z = -6; z <= 6; z += 1.5) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, Math.sin(x * 0.6) * Math.cos(z * 0.6), z);
      grid.add(mesh);
    }
  }
  scene.add(grid);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(5, 10, 3);
  scene.add(sun);

  ctx.onResize(({ width, height, pixelRatio }) => {
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });

  // ライブ更新を有効にする：コントロールを変えてもレンダラーを作り直さない
  ctx.onArgs((args) => {
    camera.fov = args.fov ?? 50;
    camera.updateProjectionMatrix();
  });

  let angle = 0;
  ctx.onFrame(({ time, delta }) => {
    angle += delta * 0.3 * (ctx.args.speed ?? 1);
    const t = angle;
    camera.position.set(Math.cos(t) * 10, 4 + Math.sin(t * 0.7) * 2, Math.sin(t) * 10);
    camera.lookAt(0, 0, 0);
    grid.children.forEach((mesh, i) => {
      mesh.rotation.x = time + i * 0.1;
      mesh.rotation.y = time * 0.5;
    });
    renderer.render(scene, camera);
  });

  return () => {
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  };
};
