export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

export type ThemePalette = {
  primaryHex: string;
  primaryLightHex: string;
  primaryAlpha30: string;
  primaryAlpha90: string;
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function rgbToHex(color: RgbColor): string {
  return (
    "#" +
    [color.r, color.g, color.b]
      .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function parseColor(value: string | null): RgbColor | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "red") {
    return { r: 255, g: 0, b: 0 };
  }

  if (/^#[0-9a-f]{3}$/.test(normalized)) {
    return {
      r: parseInt(normalized[1] + normalized[1], 16),
      g: parseInt(normalized[2] + normalized[2], 16),
      b: parseInt(normalized[3] + normalized[3], 16)
    };
  }

  if (/^#[0-9a-f]{6}$/.test(normalized)) {
    return {
      r: parseInt(normalized.slice(1, 3), 16),
      g: parseInt(normalized.slice(3, 5), 16),
      b: parseInt(normalized.slice(5, 7), 16)
    };
  }

  const rgbMatch = normalized.match(
    /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/
  );

  if (!rgbMatch) {
    return null;
  }

  return {
    r: Number(rgbMatch[1]),
    g: Number(rgbMatch[2]),
    b: Number(rgbMatch[3])
  };
}

export function rgbToHsl(color: RgbColor): { h: number; s: number; l: number } {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: lightness };
  }

  const delta = max - min;
  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue: number;

  if (max === r) {
    hue = (g - b) / delta + (g < b ? 6 : 0);
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  return { h: hue * 60, s: saturation, l: lightness };
}

export function hslToRgb(color: { h: number; s: number; l: number }): RgbColor {
  const hue = ((color.h % 360) + 360) % 360;
  const saturation = clamp(color.s, 0, 1);
  const lightness = clamp(color.l, 0, 1);
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - chroma / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) {
    r = chroma;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = chroma;
  } else if (hue < 180) {
    g = chroma;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = chroma;
  } else if (hue < 300) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }

  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255
  };
}

export function isThemeableRed(value: string | null): boolean {
  const color = parseColor(value);

  if (!color) {
    return false;
  }

  const hsl = rgbToHsl(color);
  const isRedHue = hsl.h <= 25 || hsl.h >= 335;
  const isBrandPinkHue = hsl.h >= 320 && hsl.h < 335;

  return (isRedHue || isBrandPinkHue) && hsl.s >= 0.45 && hsl.l >= 0.18;
}

export function createTheme(color: RgbColor): ThemePalette {
  const primary = createTone(color, -0.06, 0.08);
  const primaryLight = createTone(primary, 0.12, 0.04);

  return {
    primaryHex: rgbToHex(primary),
    primaryLightHex: rgbToHex(primaryLight),
    primaryAlpha30: toRgba(primary, 0.3),
    primaryAlpha90: toRgba(primary, 0.9)
  };
}

function createTone(
  color: RgbColor,
  lightnessDelta: number,
  saturationDelta: number
): RgbColor {
  const hsl = rgbToHsl(color);

  return hslToRgb({
    h: hsl.h,
    s: clamp(hsl.s + saturationDelta, 0, 1),
    l: clamp(hsl.l + lightnessDelta, 0, 1)
  });
}

function toRgba(color: RgbColor, alpha: number): string {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(
    color.b
  )}, ${alpha})`;
}
