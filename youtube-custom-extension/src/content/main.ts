import { SETTINGS_STORAGE_KEY, normalizeSettings } from "../shared/settings";
import { loadSettings } from "../shared/storage";
import { createShortcutController } from "./shortcut-controller";
import { createTabIconController } from "./tab-icon-controller";
import { createThemeController } from "./theme-controller";

async function start(): Promise<void> {
  await waitForDocumentElement();

  const shortcutController = createShortcutController();
  const tabIconController = createTabIconController();
  const themeController = createThemeController();
  let settings = await loadSettings();

  shortcutController.update(settings.shortcuts);
  tabIconController.update(settings.tabIcon);
  themeController.update({
    ...settings.theme,
    iconUrl: settings.tabIcon.iconUrl
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes[SETTINGS_STORAGE_KEY]) {
      return;
    }

    settings = normalizeSettings(changes[SETTINGS_STORAGE_KEY].newValue);
    shortcutController.update(settings.shortcuts);
    tabIconController.update(settings.tabIcon);
    themeController.update({
      ...settings.theme,
      iconUrl: settings.tabIcon.iconUrl
    });
  });

  console.info("YouTube Custom Controls loaded");
}

function waitForDocumentElement(): Promise<void> {
  if (document.documentElement) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timer = window.setInterval(() => {
      if (!document.documentElement) {
        return;
      }

      window.clearInterval(timer);
      resolve();
    }, 50);
  });
}

void start();
