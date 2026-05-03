export const SETTINGS_STORAGE_KEY = "youtubeCustomSettings";
export const DEFAULT_ICON_URL = "https://www.youtube.com/favicon.ico";
export const FALLBACK_THEME_COLOR = "#ff0033";

export type ThemeMode = "auto-from-icon" | "fixed-color";

export type ShortcutSettings = {
  enabled: boolean;
  backKey: string;
  forwardKey: string;
};

export type TabIconSettings = {
  enabled: boolean;
  iconUrl: string;
};

export type ThemeSettings = {
  enabled: boolean;
  mode: ThemeMode;
  fixedColor: string;
};

export type ExtensionSettings = {
  shortcuts: ShortcutSettings;
  tabIcon: TabIconSettings;
  theme: ThemeSettings;
};

type UnknownRecord = Record<string, unknown>;

const ALLOWED_NAMED_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Space",
  "Enter",
  "Backspace"
]);

export function getDefaultSettings(mode = import.meta.env.MODE): ExtensionSettings {
  const isDev = mode === "development";

  return {
    shortcuts: {
      enabled: true,
      backKey: "j",
      forwardKey: "l"
    },
    tabIcon: {
      enabled: isDev,
      iconUrl: DEFAULT_ICON_URL
    },
    theme: {
      enabled: isDev,
      mode: "auto-from-icon",
      fixedColor: FALLBACK_THEME_COLOR
    }
  };
}

export function normalizeSettings(
  value: unknown,
  defaults = getDefaultSettings()
): ExtensionSettings {
  const input = isRecord(value) ? value : {};
  const shortcuts = isRecord(input.shortcuts) ? input.shortcuts : {};
  const tabIcon = isRecord(input.tabIcon) ? input.tabIcon : {};
  const theme = isRecord(input.theme) ? input.theme : {};

  const backKey = normalizeShortcutKey(shortcuts.backKey, defaults.shortcuts.backKey);
  let forwardKey = normalizeShortcutKey(
    shortcuts.forwardKey,
    defaults.shortcuts.forwardKey
  );

  if (backKey.toLowerCase() === forwardKey.toLowerCase()) {
    forwardKey = defaults.shortcuts.forwardKey;
  }

  return {
    shortcuts: {
      enabled: normalizeBoolean(shortcuts.enabled, defaults.shortcuts.enabled),
      backKey,
      forwardKey
    },
    tabIcon: {
      enabled: normalizeBoolean(tabIcon.enabled, defaults.tabIcon.enabled),
      iconUrl: normalizeHttpsUrl(tabIcon.iconUrl, defaults.tabIcon.iconUrl)
    },
    theme: {
      enabled: normalizeBoolean(theme.enabled, defaults.theme.enabled),
      mode: theme.mode === "fixed-color" ? "fixed-color" : defaults.theme.mode,
      fixedColor: normalizeHexColor(theme.fixedColor, defaults.theme.fixedColor)
    }
  };
}

export function normalizeShortcutKey(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const key = value.trim();

  if (/^[a-z0-9]$/i.test(key)) {
    return key.toLowerCase();
  }

  if (ALLOWED_NAMED_KEYS.has(key)) {
    return key;
  }

  return fallback;
}

export function normalizeHttpsUrl(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  try {
    const url = new URL(value.trim());

    if (url.protocol !== "https:") {
      return fallback;
    }

    return url.toString();
  } catch {
    return fallback;
  }
}

export function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const color = value.trim().toLowerCase();

  if (/^#[0-9a-f]{6}$/.test(color)) {
    return color;
  }

  if (/^#[0-9a-f]{3}$/.test(color)) {
    return (
      "#" +
      color
        .slice(1)
        .split("")
        .map((char) => char + char)
        .join("")
    );
  }

  return fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
