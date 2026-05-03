import type { ShortcutSettings } from "../shared/settings";

const ARROW_KEY_CONFIG = {
  back: {
    key: "ArrowLeft",
    code: "ArrowLeft",
    keyCode: 37
  },
  forward: {
    key: "ArrowRight",
    code: "ArrowRight",
    keyCode: 39
  }
} as const;

export type ShortcutController = ReturnType<typeof createShortcutController>;

export function createShortcutController(targetDocument = document) {
  let settings: ShortcutSettings | null = null;
  let isEnabled = false;

  function handleKeyDown(event: KeyboardEvent): void {
    if (!settings || !isEnabled) {
      return;
    }

    if (
      isEditableTarget(event.target) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return;
    }

    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const direction =
      key === settings.backKey ? "back" : key === settings.forwardKey ? "forward" : null;

    if (!direction) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    dispatchArrowKey(ARROW_KEY_CONFIG[direction], targetDocument);
  }

  return {
    enable(nextSettings: ShortcutSettings) {
      settings = nextSettings;

      if (isEnabled) {
        return;
      }

      isEnabled = true;
      targetDocument.addEventListener("keydown", handleKeyDown, true);
    },
    update(nextSettings: ShortcutSettings) {
      if (nextSettings.enabled) {
        this.enable(nextSettings);
      } else {
        this.disable();
      }
    },
    disable() {
      if (!isEnabled) {
        settings = null;
        return;
      }

      targetDocument.removeEventListener("keydown", handleKeyDown, true);
      settings = null;
      isEnabled = false;
    }
  };
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function dispatchArrowKey(
  keyConfig: { key: string; code: string; keyCode: number },
  targetDocument: Document
): void {
  const eventWindow = targetDocument.defaultView ?? window;

  targetDocument.dispatchEvent(
    new eventWindow.KeyboardEvent("keydown", {
      key: keyConfig.key,
      code: keyConfig.code,
      keyCode: keyConfig.keyCode,
      which: keyConfig.keyCode,
      bubbles: true,
      cancelable: true,
      composed: true
    })
  );
}
