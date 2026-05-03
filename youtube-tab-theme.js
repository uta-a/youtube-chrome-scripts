(function () {
  const ICON_URL = "https://i.imgur.com/smncvp9.png";
  const THEME_STYLE_ID = "youtube-tab-theme-style";
  const CANVAS_SIZE = 48;
  const RED_FILL_VALUES = ["#ff0033", "#ff0000", "#f00", "red"];
  const THEME_VARIABLES = {
    primary: [
      "--yt-spec-static-brand-red",
      "--yt-spec-red-30",
      "--yt-spec-red-70",
      "--yt-spec-brand-button-background",
      "--yt-deprecated-brand-medium-red",
      "--yt-deprecated-brand-light-red",
      "--yt-deprecated-brand-youtube-red",
      "--yt-deprecated-red-30",
      "--yt-deprecated-red-70",
      "--yt-sys-color-baseline--static-brand-red",
      "--yt-sys-color-baseline--red-indicator",
      "--yt-sys-color-baseline--brand-red-contrast",
    ],
    alpha30: [
      "--yt-deprecated-brand-light-red-alpha-30",
      "--yt-deprecated-brand-medium-red-alpha-30",
      "--yt-sys-color-baseline--error-background-red",
    ],
    alpha90: ["--yt-deprecated-brand-medium-red-alpha-90"],
  };

  let extractedTheme = null;
  let isExtractingTheme = false;
  let observer = null;
  let observerTarget = null;
  let isThemeApplyScheduled = false;

  function removeCurrentTabIcons() {
    document
      .querySelectorAll("link[rel='icon'], link[rel='shortcut icon']")
      .forEach((link) => link.remove());
  }

  function createTabIconLink() {
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    link.href = ICON_URL;

    return link;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function rgbToHex(color) {
    return (
      "#" +
      [color.r, color.g, color.b]
        .map((value) =>
          clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")
        )
        .join("")
    );
  }

  function rgbToHsl(color) {
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
      lightness > 0.5
        ? delta / (2 - max - min)
        : delta / (max + min);
    let hue;

    if (max === r) {
      hue = (g - b) / delta + (g < b ? 6 : 0);
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }

    return { h: hue * 60, s: saturation, l: lightness };
  }

  function hslToRgb(color) {
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
      b: (b + m) * 255,
    };
  }

  function createTone(color, lightnessDelta, saturationDelta) {
    const hsl = rgbToHsl(color);

    return hslToRgb({
      h: hsl.h,
      s: clamp(hsl.s + saturationDelta, 0, 1),
      l: clamp(hsl.l + lightnessDelta, 0, 1),
    });
  }

  function toRgba(color, alpha) {
    return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(
      color.b
    )}, ${alpha})`;
  }

  function parseColor(value) {
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
        b: parseInt(normalized[3] + normalized[3], 16),
      };
    }

    if (/^#[0-9a-f]{6}$/.test(normalized)) {
      return {
        r: parseInt(normalized.slice(1, 3), 16),
        g: parseInt(normalized.slice(3, 5), 16),
        b: parseInt(normalized.slice(5, 7), 16),
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
      b: Number(rgbMatch[3]),
    };
  }

  function isThemeableRed(value) {
    const color = parseColor(value);

    if (!color) {
      return false;
    }

    const hsl = rgbToHsl(color);
    const isRedHue = hsl.h <= 25 || hsl.h >= 335;
    const isBrandPinkHue = hsl.h >= 320 && hsl.h < 335;

    return (isRedHue || isBrandPinkHue) && hsl.s >= 0.45 && hsl.l >= 0.18;
  }

  function loadIconImage() {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to load icon image"));
      image.src = ICON_URL;
    });
  }

  function getImagePixels(image) {
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

  function getDominantMaterialColor(pixels) {
    const swatches = new Map();

    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3];

      if (alpha < 128) {
        continue;
      }

      const color = {
        r: pixels[index],
        g: pixels[index + 1],
        b: pixels[index + 2],
      };
      const hsl = rgbToHsl(color);

      if (hsl.s < 0.18 || hsl.l < 0.12 || hsl.l > 0.92) {
        continue;
      }

      const key = [
        Math.round(color.r / 16),
        Math.round(color.g / 16),
        Math.round(color.b / 16),
      ].join(",");
      const swatch = swatches.get(key) || {
        r: 0,
        g: 0,
        b: 0,
        count: 0,
        saturation: 0,
        lightness: 0,
      };

      swatch.r += color.r;
      swatch.g += color.g;
      swatch.b += color.b;
      swatch.count += 1;
      swatch.saturation += hsl.s;
      swatch.lightness += hsl.l;
      swatches.set(key, swatch);
    }

    let best = null;
    let bestScore = -Infinity;

    swatches.forEach((swatch) => {
      const color = {
        r: swatch.r / swatch.count,
        g: swatch.g / swatch.count,
        b: swatch.b / swatch.count,
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

  function createTheme(color) {
    const primary = createTone(color, -0.06, 0.08);
    const primaryLight = createTone(primary, 0.12, 0.04);

    return {
      primary,
      primaryHex: rgbToHex(primary),
      primaryLightHex: rgbToHex(primaryLight),
      primaryAlpha30: toRgba(primary, 0.3),
      primaryAlpha90: toRgba(primary, 0.9),
    };
  }

  function applyThemeVariables(theme) {
    THEME_VARIABLES.primary.forEach((name) => {
      document.documentElement.style.setProperty(name, theme.primaryHex);
    });

    THEME_VARIABLES.alpha30.forEach((name) => {
      document.documentElement.style.setProperty(name, theme.primaryAlpha30);
    });

    THEME_VARIABLES.alpha90.forEach((name) => {
      document.documentElement.style.setProperty(name, theme.primaryAlpha90);
    });
  }

  function applyThemedAttributes(theme) {
    RED_FILL_VALUES.forEach((fill) => {
      document
        .querySelectorAll(
          `[fill='${fill}'], [fill='${fill.toUpperCase()}'], ` +
            `[stroke='${fill}'], [stroke='${fill.toUpperCase()}'], ` +
            `[stop-color='${fill}'], [stop-color='${fill.toUpperCase()}']`
        )
        .forEach((element) => {
          if (element.hasAttribute("fill")) {
            element.setAttribute("fill", theme.primaryHex);
          }

          if (element.hasAttribute("stroke")) {
            element.setAttribute("stroke", theme.primaryHex);
          }

          if (element.hasAttribute("stop-color")) {
            element.setAttribute("stop-color", theme.primaryHex);
          }
        });
    });

    document
      .querySelectorAll("[fill], [stroke], [stop-color]")
      .forEach((element) => {
        const fill = element.getAttribute("fill");
        const stroke = element.getAttribute("stroke");
        const stopColor = element.getAttribute("stop-color");

        if (isThemeableRed(fill)) {
          element.setAttribute("fill", theme.primaryHex);
        }

        if (isThemeableRed(stroke)) {
          element.setAttribute("stroke", theme.primaryHex);
        }

        if (isThemeableRed(stopColor)) {
          element.setAttribute("stop-color", theme.primaryHex);
        }
      });
  }

  function applyThemeStyles(theme) {
    if (!document.head) {
      return;
    }

    let style = document.getElementById(THEME_STYLE_ID);

    if (!style) {
      style = document.createElement("style");
      style.id = THEME_STYLE_ID;
      document.head.appendChild(style);
    }

    const cssText = `
      .ytp-swatch-background-color,
      .ytp-play-progress,
      .ytp-scrubber-button,
      .ytp-progress-linear-live-buffer,
      .ytp-ad-progress,
      .ytp-ad-progress-list,
      .ytp-ad-progress-list .ytp-play-progress,
      .ytp-autonav-endscreen-countdown-container,
      .ytp-autonav-endscreen-countdown-number,
      .ytp-chrome-controls .ytp-button[aria-pressed="true"],
      .ytp-settings-button.ytp-hd-quality-badge::after,
      .ytp-settings-button.ytp-4k-quality-badge::after,
      .ytp-settings-button.ytp-5k-quality-badge::after,
      .ytp-settings-button.ytp-8k-quality-badge::after,
      ytd-notification-topbar-button-renderer #notification-count,
      ytd-notification-renderer #notification-count,
      ytd-masthead #notification-count,
      ytd-topbar-menu-button-renderer #notification-count,
      yt-icon-button #notification-count,
      yt-notification-action-renderer #notification-count,
      yt-notification-action-renderer .notification-count,
      #notification-count {
        background-color: ${theme.primaryHex} !important;
      }

      .ytp-hover-progress,
      .ytp-chapter-hover-container,
      .ytp-progress-bar-hover .ytp-hover-progress,
      .ytp-fine-scrubbing .ytp-hover-progress,
      .ytp-scrubber-pull-indicator,
      .ytp-heat-map-edu,
      .ytp-heat-map-chapter {
        background-color: ${theme.primaryAlpha30} !important;
      }

      .ytp-play-progress,
      .ytp-hover-progress,
      .ytp-scrubber-button,
      .ytp-progress-linear-live-buffer {
        background-image: none !important;
      }

      .ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment {
        background: linear-gradient(
          90deg,
          ${theme.primaryHex} 80%,
          ${theme.primaryLightHex}
        ) !important;
      }

      .ytp-swatch-color {
        color: ${theme.primaryHex} !important;
      }

      ytd-notification-topbar-button-renderer #notification-count,
      ytd-notification-renderer #notification-count,
      ytd-masthead #notification-count,
      ytd-topbar-menu-button-renderer #notification-count,
      yt-icon-button #notification-count,
      yt-notification-action-renderer #notification-count,
      yt-notification-action-renderer .notification-count,
      #notification-count {
        color: #fff !important;
        border-color: #fff !important;
      }

      ytd-logo path[fill="#FF0033"],
      ytd-logo path[fill="#ff0033"],
      ytd-logo path[fill="#FF0000"],
      ytd-logo path[fill="#ff0000"],
      ytd-logo path[fill="#f00"],
      yt-icon path[fill="#FF0033"],
      yt-icon path[fill="#ff0033"],
      yt-icon path[fill="#FF0000"],
      yt-icon path[fill="#ff0000"],
      yt-icon path[fill="#f00"],
      .ytp-heat-map-container stop[stop-color="#E1002D"],
      .ytp-heat-map-container stop[stop-color="#e1002d"],
      .ytp-heat-map-container stop[stop-color="#E01378"],
      .ytp-heat-map-container stop[stop-color="#e01378"] {
        fill: ${theme.primaryHex} !important;
        stop-color: ${theme.primaryHex} !important;
      }

      tp-yt-paper-spinner .spinner-layer,
      paper-spinner-lite .spinner-layer {
        border-color: ${theme.primaryHex} !important;
      }

      .ytp-volume-slider-handle,
      .ytp-volume-slider-handle::before,
      .ytp-volume-slider-handle::after {
        background-color: ${theme.primaryLightHex} !important;
      }
    `;

    if (style.textContent !== cssText) {
      style.textContent = cssText;
    }
  }

  function applyTheme(theme) {
    applyThemeVariables(theme);
    applyThemeStyles(theme);
    applyThemedAttributes(theme);
  }

  async function extractAndApplyTheme() {
    if (isExtractingTheme || extractedTheme) {
      return;
    }

    isExtractingTheme = true;

    try {
      const image = await loadIconImage();
      const pixels = getImagePixels(image);
      const dominantColor = getDominantMaterialColor(pixels);

      if (!dominantColor) {
        throw new Error("No suitable icon color found");
      }

      extractedTheme = createTheme(dominantColor);
      applyTheme(extractedTheme);
      console.info(
        "YouTube theme color extracted from custom icon",
        extractedTheme.primaryHex
      );
    } catch (error) {
      console.warn("YouTube custom theme color could not be applied", error);
    } finally {
      isExtractingTheme = false;
    }
  }

  function changeTabIcon() {
    if (!document.head) {
      return;
    }

    removeCurrentTabIcons();
    document.head.appendChild(createTabIconLink());
  }

  function hasCustomTabIcon() {
    return Array.from(
      document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']")
    ).some(
      (link) =>
        link.getAttribute("href") === ICON_URL || link.href === ICON_URL
    );
  }

  function scheduleThemeApply() {
    if (!extractedTheme || isThemeApplyScheduled) {
      return;
    }

    isThemeApplyScheduled = true;

    window.setTimeout(() => {
      isThemeApplyScheduled = false;

      if (extractedTheme) {
        applyTheme(extractedTheme);
      }
    }, 50);
  }

  function observeTarget(target) {
    if (!target || observerTarget === target) {
      return;
    }

    if (observer) {
      observer.disconnect();
    }

    observerTarget = target;
    observer.observe(target, {
      childList: true,
      subtree: true,
    });
  }

  function handleDocumentMutation() {
    if (!hasCustomTabIcon()) {
      changeTabIcon();
    }

    scheduleThemeApply();
  }

  function start() {
    if (!document.documentElement) {
      window.setTimeout(start, 50);
      return;
    }

    observer = new MutationObserver(handleDocumentMutation);
    observeTarget(document.documentElement);
    changeTabIcon();
    extractAndApplyTheme();
  }

  start();

  console.info("YouTube custom tab icon and theme loaded");
})();
