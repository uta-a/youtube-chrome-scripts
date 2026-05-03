import {
  type ExtensionSettings,
  SETTINGS_STORAGE_KEY,
  getDefaultSettings,
  normalizeSettings
} from "./settings";

export async function loadSettings(): Promise<ExtensionSettings> {
  const defaults = getDefaultSettings();
  const result = await chrome.storage.sync.get(SETTINGS_STORAGE_KEY);

  return normalizeSettings(result[SETTINGS_STORAGE_KEY], defaults);
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.sync.set({
    [SETTINGS_STORAGE_KEY]: normalizeSettings(settings)
  });
}

export async function resetSettings(): Promise<ExtensionSettings> {
  const defaults = getDefaultSettings();
  await chrome.storage.sync.set({ [SETTINGS_STORAGE_KEY]: defaults });

  return defaults;
}
