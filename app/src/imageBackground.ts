// Enkelte produktbilder (bl.a. fra biltema.no) har en ensfarget grå bakgrunn
// bakt inn i selve bildet, i stedet for gjennomsiktighet. Dette hviter den ut
// på klientsiden så miniatyrene ser konsistente ut mot de hvite bilde-boksene
// våre. Kjøres KUN én gang per bilde-URL og cachet på tvers av alle steder
// bildet vises (samme mønster som avatars.ts).
//
// Krever at bildeserveren tillater CORS-lesing av pixel-data. Hvis ikke (eller
// bildet ikke har en ensfarget grå bakgrunn å fjerne), beholdes originalbildet
// uendret — ingen synlig feil.

type CorrectionEntry = { status: 'pending' } | { status: 'done'; url: string | null };

const cache = new Map<string, CorrectionEntry>();
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function subscribeCorrectedImages(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getCorrectedImagesVersion(): number {
  return version;
}

/** Korrigert (hvitet) bilde som data-URL, eller null for å bruke originalen (uendret/ikke ferdig/mislyktes). */
export function getCorrectedImage(src: string): string | null {
  const entry = cache.get(src);
  return entry?.status === 'done' ? entry.url : null;
}

export function ensureBackgroundCorrection(src: string): void {
  if (!src || cache.has(src)) return;
  cache.set(src, { status: 'pending' });

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    let url: string | null;
    try {
      url = whitenFlatBackground(img);
    } catch {
      url = null; // tainted canvas (ingen CORS-støtte hos bildeserveren) eller annen feil
    }
    cache.set(src, { status: 'done', url });
    emit();
  };
  img.onerror = () => {
    cache.set(src, { status: 'done', url: null });
    emit();
  };
  img.src = src;
}

interface Rgb { r: number; g: number; b: number }

function whitenFlatBackground(img: HTMLImageElement): string | null {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, w, h); // kaster SecurityError uten CORS
  const { data } = imageData;

  const corners = ([[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]] as const)
    .map(([x, y]) => samplePixel(data, w, x, y));
  const bg = averageColor(corners);

  if (!looksLikeUniformLightGray(corners, bg)) return null;
  if (bg.r > 250 && bg.g > 250 && bg.b > 250) return null; // allerede hvitt nok

  const tolerance = 42;
  for (let i = 0; i < data.length; i += 4) {
    const dist = Math.sqrt(
      (data[i] - bg.r) ** 2 + (data[i + 1] - bg.g) ** 2 + (data[i + 2] - bg.b) ** 2
    );
    if (dist < tolerance) {
      const factor = 1 - dist / tolerance;
      data[i] += (255 - data[i]) * factor;
      data[i + 1] += (255 - data[i + 1]) * factor;
      data[i + 2] += (255 - data[i + 2]) * factor;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

function samplePixel(data: Uint8ClampedArray, width: number, x: number, y: number): Rgb {
  const i = (y * width + x) * 4;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
}

function averageColor(colors: Rgb[]): Rgb {
  const sum = colors.reduce((acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }), { r: 0, g: 0, b: 0 });
  return { r: sum.r / colors.length, g: sum.g / colors.length, b: sum.b / colors.length };
}

/** Bakgrunnen må være nokså lys og nøytral, og hjørnene nokså like hverandre
 * (ellers er det trolig produktet selv som fyller et hjørne, ikke bakgrunnen). */
function looksLikeUniformLightGray(corners: Rgb[], avg: Rgb): boolean {
  const lightness = (avg.r + avg.g + avg.b) / 3;
  if (lightness < 190) return false;
  const maxChannelDiff = Math.max(Math.abs(avg.r - avg.g), Math.abs(avg.g - avg.b), Math.abs(avg.r - avg.b));
  if (maxChannelDiff > 12) return false;
  return corners.every((c) => Math.sqrt((c.r - avg.r) ** 2 + (c.g - avg.g) ** 2 + (c.b - avg.b) ** 2) < 20);
}
