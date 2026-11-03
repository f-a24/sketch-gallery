import { defineConfig } from 'vite';
import sketchGallery from 'sketch-gallery/vite';

export default defineConfig({
  // GitHub Pages のサブパス配信でも動くよう相対パスで出力する
  base: './',
  plugins: [sketchGallery({ dir: 'src/sketches' })],
});
