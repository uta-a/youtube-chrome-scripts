import type { TabIconSettings } from "../shared/settings";

export function createTabIconController(targetDocument = document) {
  let settings: TabIconSettings | null = null;
  let observer: MutationObserver | null = null;

  function changeTabIcon(): void {
    if (!settings || !targetDocument.head) {
      return;
    }

    removeCurrentTabIcons(targetDocument);
    targetDocument.head.appendChild(createTabIconLink(settings.iconUrl, targetDocument));
  }

  function hasCustomTabIcon(): boolean {
    if (!settings) {
      return false;
    }

    return Array.from(
      targetDocument.querySelectorAll<HTMLLinkElement>(
        "link[rel='icon'], link[rel='shortcut icon']"
      )
    ).some(
      (link) =>
        link.dataset.youtubeCustomIcon === "true" &&
        (link.getAttribute("href") === settings?.iconUrl || link.href === settings?.iconUrl)
    );
  }

  return {
    enable(nextSettings: TabIconSettings) {
      settings = nextSettings;
      changeTabIcon();

      if (observer) {
        return;
      }

      observer = new MutationObserver(() => {
        if (!hasCustomTabIcon()) {
          changeTabIcon();
        }
      });

      if (targetDocument.head) {
        observer.observe(targetDocument.head, {
          childList: true
        });
      }
    },
    update(nextSettings: TabIconSettings) {
      if (!nextSettings.enabled) {
        this.disable();
        return;
      }

      const iconChanged = settings?.iconUrl !== nextSettings.iconUrl;
      this.enable(nextSettings);

      if (iconChanged) {
        changeTabIcon();
      }
    },
    disable() {
      observer?.disconnect();
      observer = null;
      settings = null;
      targetDocument
        .querySelectorAll<HTMLLinkElement>("link[data-youtube-custom-icon='true']")
        .forEach((link) => link.remove());
    }
  };
}

function removeCurrentTabIcons(targetDocument: Document): void {
  targetDocument
    .querySelectorAll("link[rel='icon'], link[rel='shortcut icon']")
    .forEach((link) => link.remove());
}

function createTabIconLink(iconUrl: string, targetDocument: Document): HTMLLinkElement {
  const link = targetDocument.createElement("link");
  link.rel = "icon";
  link.type = "image/png";
  link.href = iconUrl;
  link.dataset.youtubeCustomIcon = "true";

  return link;
}
