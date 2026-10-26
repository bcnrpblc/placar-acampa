/** Color a team has until a mascot picks one for it, or the admin chooses. */
export const NEUTRAL_TEAM_COLOR = "#6b7280";

/** Main saturated color of an image as #rrggbb, ignoring white/black/grey backgrounds. Null if there is none. */
export async function dominantColor(file: File): Promise<string | null> {
  const bmp = await createImageBitmap(file);
  const w = 64;
  const h = Math.max(1, Math.round((bmp.height / bmp.width) * w));
  const ctx = new OffscreenCanvas(w, h).getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;

  // 24 hue bins of 15°, weighted by saturation so vivid pixels beat washed-out ones
  const bins = Array.from({ length: 24 }, () => ({ weight: 0, r: 0, g: 0, b: 0, n: 0 }));
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 200) continue;
    const [r, g, b] = [px[i] / 255, px[i + 1] / 255, px[i + 2] / 255];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (s < 0.35 || l < 0.2 || l > 0.85) continue;
    const hue = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    const bin = bins[Math.floor((hue * 60) / 15) % 24];
    bin.weight += s;
    bin.r += px[i]; bin.g += px[i + 1]; bin.b += px[i + 2]; bin.n++;
  }
  const best = bins.reduce((a, b) => (b.weight > a.weight ? b : a));
  if (!best.n) return null;
  return "#" + [best.r, best.g, best.b].map((v) => Math.round(v / best.n).toString(16).padStart(2, "0")).join("");
}
