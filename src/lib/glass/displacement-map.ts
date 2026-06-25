/**
 * Liquid-glass displacement map — computed from optics, not painted.
 *
 * Adapted from Outpace Studios' "Liquid glass for the web" write-up (and the
 * Aave "Building Glass for the Web" architecture it credits). The lens is a
 * convex squircle dome: flat across the centre, curving down through a thin
 * rim band. For each pixel we take the dome's slope, refract a straight-down
 * view ray through it with Snell's law at glass IoR 1.5, and write the bent
 * ray's sideways throw into the R/G channels (128 = leave the backdrop put),
 * aimed along the outward normal we read off a rounded-rect signed-distance
 * field. The slope is zero in the flat centre and steepens toward the edge, so
 * the bend concentrates at the rim exactly like a thick pane of real glass. B
 * carries the rim's specular height.
 *
 * THE DETAIL THAT BITES: the map must reach the SVG `feImage` as a `blob:` URL.
 * WebKit silently refuses to load a `data:` URI inside `feImage`, so the glass
 * collapses to flat frost on Safari/iOS if you inline it. Blobs load
 * everywhere. We also keep the filter in sRGB so a given grey displaces by the
 * amount we actually wrote.
 *
 * The map is square + normalised; `feImage preserveAspectRatio="none"` stretches
 * it to each element's box, so one map serves every glass control. Generated
 * once per param-set and cached (cheap, but no reason to recompute).
 */

export interface GlassMapParams {
  /** Reference square resolution of the map in px. */
  size?: number;
  /** Corner radius as a fraction of the half-size (0..1). 1 = full pill. */
  radius?: number;
  /** Rim-band thickness as a fraction of the half-size — where the bend lives. */
  band?: number;
  /** Displacement strength multiplier baked into the channel values. */
  gain?: number;
}

const cache = new Map<string, string>();

function dataURLtoBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(head)?.[1] ?? "image/png";
  const bin = atob(body);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * Build the displacement map and return a `blob:` URL (or null off the client).
 * Result is memoised per param-set for the page lifetime.
 */
export function buildGlassDisplacementMap(p: GlassMapParams = {}): string | null {
  if (typeof document === "undefined") return null;
  const size = p.size ?? 320;
  const radius = p.radius ?? 1;
  const band = p.band ?? 0.4;
  const gain = p.gain ?? 1;
  const key = `${size}:${radius}:${band}:${gain}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const img = ctx.createImageData(size, size);
  const data = img.data;

  const hw = size / 2;
  const hh = size / 2;
  const r = Math.min(radius, 1) * Math.min(hw, hh);
  const bandPx = Math.max(1, band * Math.min(hw, hh));

  // Signed distance to a rounded rectangle centred in the canvas; negative
  // inside, zero on the edge, positive outside.
  const sd = (px: number, py: number): number => {
    const qx = Math.abs(px - hw) - hw + r;
    const qy = Math.abs(py - hh) - hh + r;
    const ox = Math.max(qx, 0);
    const oy = Math.max(qy, 0);
    return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const cx = x + 0.5;
      const cy = y + 0.5;
      const d = sd(cx, cy);

      if (d >= 0) {
        // Outside the lens — neutral (no displacement, no specular).
        data[i] = 128;
        data[i + 1] = 128;
        data[i + 2] = 0;
        data[i + 3] = 255;
        continue;
      }

      // Depth in from the rim: 0 at the edge → 1 in the flat centre.
      const xc = Math.min(-d / bandPx, 1);
      // Squircle-dome surface slope (Outpace's curve): 0 centre, steep rim.
      const oneMinus = 1 - xc;
      const slope =
        Math.pow(oneMinus, 3) / Math.pow(1 - Math.pow(oneMinus, 4), 0.75);
      const thetaI = Math.atan(slope);
      const thetaT = Math.asin(Math.sin(thetaI) / 1.5); // Snell's law, IoR 1.5
      const bend = Math.sin(thetaI - thetaT); // 0 centre, max at the rim

      // Outward surface normal = gradient of the SDF (finite differences).
      let nx = sd(cx + 1, cy) - sd(cx - 1, cy);
      let ny = sd(cx, cy + 1) - sd(cx, cy - 1);
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl;
      ny /= nl;

      const r8 = 128 + nx * bend * gain * 127;
      const g8 = 128 + ny * bend * gain * 127;
      data[i] = Math.max(0, Math.min(255, r8));
      data[i + 1] = Math.max(0, Math.min(255, g8));
      // Specular height — brightest where the slope is steepest (the rim).
      data[i + 2] = Math.max(0, Math.min(255, bend * 255 * 1.6));
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const url = URL.createObjectURL(dataURLtoBlob(canvas.toDataURL()));
  cache.set(key, url);
  return url;
}
