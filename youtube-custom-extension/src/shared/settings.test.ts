import { describe, expect, it } from "vitest";

import {
  DEFAULT_ICON_URL,
  FALLBACK_THEME_COLOR,
  getDefaultSettings,
  normalizeSettings
} from "./settings";

describe("settings", () => {
  it("uses dev defaults in development mode", () => {
    expect(getDefaultSettings("development")).toEqual({
      shortcuts: { enabled: true, backKey: "j", forwardKey: "l" },
      tabIcon: { enabled: true, iconUrl: DEFAULT_ICON_URL },
      theme: {
        enabled: true,
        mode: "auto-from-icon",
        fixedColor: FALLBACK_THEME_COLOR
      }
    });
  });

  it("keeps favicon and theme changes off by default in production mode", () => {
    const settings = getDefaultSettings("production");

    expect(settings.shortcuts.enabled).toBe(true);
    expect(settings.tabIcon.enabled).toBe(false);
    expect(settings.theme.enabled).toBe(false);
  });

  it("normalizes broken saved values against the provided defaults", () => {
    const defaults = getDefaultSettings("production");

    expect(
      normalizeSettings(
        {
          shortcuts: {
            enabled: "yes",
            backKey: "Control",
            forwardKey: "Control"
          },
          tabIcon: {
            enabled: true,
            iconUrl: "http://example.com/icon.png"
          },
          theme: {
            enabled: true,
            mode: "unknown",
            fixedColor: "#f0a"
          }
        },
        defaults
      )
    ).toEqual({
      shortcuts: { enabled: true, backKey: "j", forwardKey: "l" },
      tabIcon: { enabled: true, iconUrl: DEFAULT_ICON_URL },
      theme: {
        enabled: true,
        mode: "auto-from-icon",
        fixedColor: "#ff00aa"
      }
    });
  });

  it("prevents duplicated shortcut keys", () => {
    const settings = normalizeSettings({
      shortcuts: {
        enabled: true,
        backKey: "a",
        forwardKey: "A"
      }
    });

    expect(settings.shortcuts).toEqual({
      enabled: true,
      backKey: "a",
      forwardKey: "l"
    });
  });
});
