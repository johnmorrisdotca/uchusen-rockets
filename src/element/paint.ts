// Pictures painted on canvases at run time for the painted look: the panels of a steel hull and a mosaic of tiles. Canvases only, so a page's content security policy needs nothing for them, and made from
// a seed, so they are the same every time.

export function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One repeat of a stainless hull: panels of slightly different tone, with weld lines between them. Its colour multiplies the steel's. `across` panels wide and `down` rings tall. */
export function paintSteel(across: number, down: number): HTMLCanvasElement {
  const size = 1024;
  const c = canvas(size, size);
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  const random = seeded(7);
  const w = size / across;
  const h = size / down;
  for (let j = 0; j < down; j++) {
    // the courses of panels are staggered
    const shift = (j % 2) * (w / 2);
    for (let i = -1; i < across; i++) {
      const tone = 214 + Math.round(random() * 38);
      ctx.fillStyle = `rgb(${tone},${tone},${tone + 2})`;
      ctx.fillRect(i * w + shift, j * h, w + 1, h + 1);
    }
  }
  // a little grain along the sheet
  for (let k = 0; k < 2600; k++) {
    const alpha = 0.02 + random() * 0.05;
    ctx.fillStyle = random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.fillRect(random() * size, random() * size, 1 + random() * 28, 1);
  }
  // weld lines
  ctx.fillStyle = "rgba(58,60,64,0.62)";
  for (let j = 0; j <= down; j++) ctx.fillRect(0, j * h - 1, size, 2);
  for (let j = 0; j < down; j++) for (let i = -1; i <= across; i++) ctx.fillRect(i * w + (j % 2) * (w / 2) - 0.7, j * h, 1.4, h);
  return c;
}

/** A mosaic of hexagonal tiles in black with hair-thin gaps. `across` flats wide in one repeat. */
export function paintTiles(across: number): HTMLCanvasElement {
  const size = 1024;
  const c = canvas(size, size);
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.fillStyle = "#3a3c40";
  ctx.fillRect(0, 0, size, size);
  const random = seeded(11);
  const flat = size / across;
  const r = flat / Math.sqrt(3);
  const rowH = r * 1.5;
  const rows = Math.round(size / rowH / 2) * 2;
  const stepY = size / rows;
  for (let j = -1; j <= rows; j++)
    for (let i = -1; i <= across; i++) {
      const x = (i + (j % 2 ? 0.5 : 0)) * flat;
      const y = j * stepY;
      const tone = 13 + Math.round(random() * 12);
      ctx.fillStyle = `rgb(${tone},${tone},${tone + 1})`;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 6 + (k * Math.PI) / 3;
        const px = x + (r - 0.9) * Math.cos(a);
        const py = y + (r - 0.9) * Math.sin(a);
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  return c;
}

/** A soft round glow: the pool of light under a rocket. */
export function paintGlow(inner: string, outer: string): HTMLCanvasElement {
  const n = 128;
  const c = canvas(n, n);
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  const g = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, n, n);
  return c;
}
