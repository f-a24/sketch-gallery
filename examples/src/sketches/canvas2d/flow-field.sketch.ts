import type { RenderFn, Sketch } from 'sketch-gallery';

type ParticleArgs = { count: number; speed: number; trail: number; color: string };

const particles: RenderFn<ParticleArgs> = ({
  canvas,
  width,
  height,
  pixelRatio,
  args,
  onFrame,
  onResize,
}) => {
  const g = canvas.getContext('2d')!;
  let w = width;
  let h = height;
  g.scale(pixelRatio, pixelRatio);

  const points = Array.from({ length: args.count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
  }));

  onResize((size) => {
    w = size.width;
    h = size.height;
    g.setTransform(size.pixelRatio, 0, 0, size.pixelRatio, 0, 0);
  });

  onFrame(({ time }) => {
    g.fillStyle = `rgb(8 8 12 / ${args.trail})`;
    g.fillRect(0, 0, w, h);
    g.fillStyle = args.color;
    for (const p of points) {
      const angle = Math.sin(p.x * 0.004 + time * 0.3) * Math.cos(p.y * 0.004) * Math.PI * 2;
      p.x += Math.cos(angle) * args.speed;
      p.y += Math.sin(angle) * args.speed;
      if (p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
        p.x = Math.random() * w;
        p.y = Math.random() * h;
      }
      g.fillRect(p.x, p.y, 1.2, 1.2);
    }
  });
};

/** onArgs なし：コントロールを変えると新しい args で再マウントされる */
export const Particles: Sketch<ParticleArgs> = {
  render: particles,
  args: { count: 1500, speed: 1.2, trail: 0.08, color: '#ffb45a' },
  argTypes: {
    count: { min: 100, max: 8000, step: 100 },
    speed: { min: 0.1, max: 5 },
    trail: { min: 0.01, max: 1, label: 'Fade' },
  },
};

type GridArgs = { step: number; shape: 'circle' | 'square'; saturation: number };

/** 静止画スケッチ：一度だけ描き、リサイズ時のみ描き直す */
export const Grid: Sketch<GridArgs> = {
  parameters: { frameloop: 'never', background: '#f4f1ea' },
  args: { step: 32, shape: 'circle', saturation: 60 },
  argTypes: {
    step: { min: 12, max: 96, step: 1 },
    shape: { options: ['circle', 'square'] },
    saturation: { min: 0, max: 100, step: 1 },
  },
  render: ({ canvas, width, height, pixelRatio, args, onResize }) => {
    const g = canvas.getContext('2d')!;
    const draw = (w: number, h: number, dpr: number) => {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      const { step, shape, saturation } = args;
      for (let y = step / 2; y < h; y += step) {
        for (let x = step / 2; x < w; x += step) {
          const r = step * (0.12 + 0.3 * Math.abs(Math.sin(x * 0.01) * Math.cos(y * 0.013)));
          g.fillStyle = `hsl(${(x + y) * 0.2} ${saturation}% 45%)`;
          if (shape === 'square') {
            g.fillRect(x - r, y - r, r * 2, r * 2);
          } else {
            g.beginPath();
            g.arc(x, y, r, 0, Math.PI * 2);
            g.fill();
          }
        }
      }
    };
    draw(width, height, pixelRatio);
    onResize((size) => draw(size.width, size.height, size.pixelRatio));
  },
};
