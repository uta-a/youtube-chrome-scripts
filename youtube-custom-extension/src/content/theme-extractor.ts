import { type RgbColor, rgbToHsl } from "./color";

const CANVAS_SIZE = 48;

export async function extractDominantColorFromImage(iconUrl: string): Promise<RgbColor> {
  const image = await loadIconImage(iconUrl);
  const pixels = getImagePixels(image);
  const dominantColor = getDominantMaterialColor(pixels);

  if (!dominantColor) {
    throw new Error("No suitable icon color found");
  }

  return dominantColor;
}

function loadIconImage(iconUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load icon image"));
    image.src = iconUrl;
  });
}

function getImagePixels(image: HTMLImageElement): Uint8ClampedArray {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Canvas 2D context is not available");
  }

  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  context.drawImage(image, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

  return context.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
}

function getDominantMaterialColor(pixels: Uint8ClampedArray): RgbColor | null {
  const swatches = new Map<
    string,
    RgbColor & { count: number; saturation: number; lightness: number }
  >();

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3];

    if (alpha < 128) {
      continue;
    }

    const color = {
      r: pixels[index],
      g: pixels[index + 1],
      b: pixels[index + 2]
    };
    const hsl = rgbToHsl(color);

    if (hsl.s < 0.18 || hsl.l < 0.12 || hsl.l > 0.92) {
      continue;
    }

    const key = [
      Math.round(color.r / 16),
      Math.round(color.g / 16),
      Math.round(color.b / 16)
    ].join(",");
    const swatch = swatches.get(key) || {
      r: 0,
      g: 0,
      b: 0,
      count: 0,
      saturation: 0,
      lightness: 0
    };

    swatch.r += color.r;
    swatch.g += color.g;
    swatch.b += color.b;
    swatch.count += 1;
    swatch.saturation += hsl.s;
    swatch.lightness += hsl.l;
    swatches.set(key, swatch);
  }

  let best: RgbColor | null = null;
  let bestScore = -Infinity;

  swatches.forEach((swatch) => {
    const color = {
      r: swatch.r / swatch.count,
      g: swatch.g / swatch.count,
      b: swatch.b / swatch.count
    };
    const saturation = swatch.saturation / swatch.count;
    const lightness = swatch.lightness / swatch.count;
    const targetLightness = 0.52;
    const score =
      swatch.count *
      (0.65 + saturation) *
      (1 - Math.min(Math.abs(lightness - targetLightness), 0.5));

    if (score > bestScore) {
      best = color;
      bestScore = score;
    }
  });

  return best;
}
