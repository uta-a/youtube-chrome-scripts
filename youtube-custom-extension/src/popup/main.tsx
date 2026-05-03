import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { RotateCcw, Settings2 } from "lucide-react";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import {
  type ExtensionSettings,
  type ThemeMode,
  normalizeSettings
} from "../shared/settings";
import { loadSettings, resetSettings, saveSettings } from "../shared/storage";
import "./styles.css";

type SaveState = "idle" | "saving" | "saved" | "error";

function App() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useDarkModeClass();

  useEffect(() => {
    let isMounted = true;

    loadSettings()
      .then((loadedSettings) => {
        if (isMounted) {
          setSettings(loadedSettings);
        }
      })
      .catch((error) => {
        console.error(error);
        if (isMounted) {
          setErrorMessage("設定を読み込めませんでした。");
          setSaveState("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const validationMessage = useMemo(() => {
    if (!settings) {
      return "";
    }

    if (
      settings.shortcuts.backKey.toLowerCase() ===
      settings.shortcuts.forwardKey.toLowerCase()
    ) {
      return "戻るキーと進むキーは別々にしてください。";
    }

    return "";
  }, [settings]);

  async function commit(nextSettings: ExtensionSettings): Promise<void> {
    const normalized = normalizeSettings(nextSettings);
    setSettings(normalized);
    setSaveState("saving");
    setErrorMessage("");

    try {
      await saveSettings(normalized);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1200);
    } catch (error) {
      console.error(error);
      setSaveState("error");
      setErrorMessage("設定を保存できませんでした。");
    }
  }

  async function handleReset(): Promise<void> {
    setSaveState("saving");
    setErrorMessage("");

    try {
      setSettings(await resetSettings());
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1200);
    } catch (error) {
      console.error(error);
      setSaveState("error");
      setErrorMessage("設定をリセットできませんでした。");
    }
  }

  function updateSettings(recipe: (current: ExtensionSettings) => ExtensionSettings): void {
    if (!settings) {
      return;
    }

    void commit(recipe(settings));
  }

  if (!settings) {
    return (
      <main className="min-h-[520px] w-[360px] bg-background p-4 text-foreground">
        <Header saveState={saveState} onReset={handleReset} resetDisabled />
        <p className="mt-4 text-sm text-muted-foreground">読み込み中</p>
      </main>
    );
  }

  return (
    <main className="min-h-[520px] w-[360px] bg-background p-4 text-foreground">
      <Header saveState={saveState} onReset={handleReset} />

      <div className="mt-4 flex flex-col gap-3">
        {errorMessage ? (
          <Message tone="error">{errorMessage}</Message>
        ) : null}
        {validationMessage ? (
          <Message tone="warning">{validationMessage}</Message>
        ) : null}

        <SettingsCard
          title="ショートカット"
          enabled={settings.shortcuts.enabled}
          onEnabledChange={(enabled) =>
            updateSettings((current) => ({
              ...current,
              shortcuts: { ...current.shortcuts, enabled }
            }))
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="戻る"
              value={settings.shortcuts.backKey}
              disabled={!settings.shortcuts.enabled}
              onCommit={(backKey) =>
                updateSettings((current) => ({
                  ...current,
                  shortcuts: { ...current.shortcuts, backKey }
                }))
              }
            />
            <TextField
              label="進む"
              value={settings.shortcuts.forwardKey}
              disabled={!settings.shortcuts.enabled}
              onCommit={(forwardKey) =>
                updateSettings((current) => ({
                  ...current,
                  shortcuts: { ...current.shortcuts, forwardKey }
                }))
              }
            />
          </div>
        </SettingsCard>

        <SettingsCard
          title="タブアイコン"
          enabled={settings.tabIcon.enabled}
          onEnabledChange={(enabled) =>
            updateSettings((current) => ({
              ...current,
              tabIcon: { ...current.tabIcon, enabled }
            }))
          }
        >
          <TextField
            label="アイコンURL"
            value={settings.tabIcon.iconUrl}
            disabled={!settings.tabIcon.enabled && !settings.theme.enabled}
            onCommit={(iconUrl) =>
              updateSettings((current) => ({
                ...current,
                tabIcon: { ...current.tabIcon, iconUrl }
              }))
            }
          />
        </SettingsCard>

        <SettingsCard
          title="テーマ色"
          enabled={settings.theme.enabled}
          onEnabledChange={(enabled) =>
            updateSettings((current) => ({
              ...current,
              theme: { ...current.theme, enabled }
            }))
          }
        >
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label>色の決め方</Label>
              <Select
                value={settings.theme.mode}
                disabled={!settings.theme.enabled}
                onValueChange={(mode: ThemeMode) =>
                  updateSettings((current) => ({
                    ...current,
                    theme: { ...current.theme, mode }
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto-from-icon">アイコンから自動</SelectItem>
                  <SelectItem value="fixed-color">固定色</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.theme.mode === "fixed-color" ? (
              <div className="grid grid-cols-[1fr_48px] items-center gap-3">
                <Label>カラーパレット</Label>
                <Input
                  type="color"
                  value={settings.theme.fixedColor}
                  disabled={!settings.theme.enabled}
                  className="h-9 w-12 p-1"
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      theme: { ...current.theme, fixedColor: event.target.value }
                    }))
                  }
                />
              </div>
            ) : null}
          </div>
        </SettingsCard>
      </div>
    </main>
  );
}

function Header({
  saveState,
  onReset,
  resetDisabled = false
}: {
  saveState: SaveState;
  onReset: () => void;
  resetDisabled?: boolean;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Settings2 className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-base font-semibold leading-none">YouTube Custom</h1>
          <p className="mt-1 text-xs text-muted-foreground">{statusLabel(saveState)}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={resetDisabled}
        aria-label="設定をリセット"
        title="設定をリセット"
        onClick={onReset}
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
      </Button>
    </header>
  );
}

function SettingsCard({
  title,
  enabled,
  onEnabledChange,
  children
}: {
  title: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="p-3 pb-0">
        <h2 className="text-sm font-medium">{title}</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {enabled ? "ON" : "OFF"}
          </span>
          <Switch checked={enabled} onCheckedChange={onEnabledChange} />
        </div>
      </CardHeader>
      <CardContent className="p-3">{children}</CardContent>
    </Card>
  );
}

function TextField({
  label,
  value,
  disabled,
  onCommit
}: {
  label: string;
  value: string;
  disabled: boolean;
  onCommit: (value: string) => void;
}) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  function commit(): void {
    if (draftValue !== value) {
      onCommit(draftValue);
    }
  }

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        type="text"
        value={draftValue}
        disabled={disabled}
        spellCheck={false}
        onBlur={commit}
        onChange={(event) => setDraftValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}

function Message({
  tone,
  children
}: {
  tone: "error" | "warning";
  children: React.ReactNode;
}) {
  return (
    <p
      className={
        tone === "error"
          ? "rounded-md bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive"
          : "rounded-md bg-amber-500/15 px-3 py-2 text-xs leading-5 text-amber-700 dark:text-amber-300"
      }
    >
      {children}
    </p>
  );
}

function statusLabel(saveState: SaveState): string {
  switch (saveState) {
    case "saving":
      return "保存中";
    case "saved":
      return "保存済み";
    case "error":
      return "エラー";
    case "idle":
      return "設定";
  }
}

function useDarkModeClass(): void {
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme(event: MediaQueryList | MediaQueryListEvent): void {
      document.documentElement.classList.toggle("dark", event.matches);
      document.documentElement.dataset.theme = event.matches ? "dark" : "light";
    }

    applyTheme(mediaQuery);
    mediaQuery.addEventListener("change", applyTheme);

    return () => {
      mediaQuery.removeEventListener("change", applyTheme);
    };
  }, []);
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
