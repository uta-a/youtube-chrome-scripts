import { FALLBACK_THEME_COLOR, type ThemeSettings } from "../shared/settings";
import {
  type ThemePalette,
  createTheme,
  isThemeableRed,
  parseColor
} from "./color";
import { extractDominantColorFromImage } from "./theme-extractor";

const THEME_STYLE_ID = "youtube-custom-theme-style";
const CONTENT_METADATA_LEADING_ICON_SELECTOR =
  ".ytIconWrapperHost.ytContentMetadataViewModelLeadingIcon";
const CONTENT_METADATA_SELECTOR = "yt-content-metadata-view-model, ytd-video-meta-block";
const LEGACY_VIEW_COUNT_SELECTOR = "#metadata-line > span:first-child";
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
    "--yt-sys-color-baseline--brand-red-contrast"
  ],
  alpha30: [
    "--yt-deprecated-brand-light-red-alpha-30",
    "--yt-deprecated-brand-medium-red-alpha-30",
    "--yt-sys-color-baseline--error-background-red"
  ],
  alpha90: ["--yt-deprecated-brand-medium-red-alpha-90"]
};
const THEME_ATTRIBUTE_NAMES = ["fill", "stroke", "stop-color"] as const;
const THEME_ATTRIBUTE_SELECTOR = "[fill], [stroke], [stop-color]";

type ThemeSource = ThemeSettings & {
  iconUrl: string;
};

type AttributeName = (typeof THEME_ATTRIBUTE_NAMES)[number];

export function createThemeController(targetDocument = document) {
  let settings: ThemeSource | null = null;
  let observer: MutationObserver | null = null;
  let isAttributeApplyScheduled = false;
  let palette: ThemePalette | null = null;
  let resolveToken = 0;
  const cssVariableOriginals = new Map<string, string>();
  const attributeOriginals = new Map<Element, Map<AttributeName, string | null>>();
  const pendingAttributeRoots = new Set<Element>();

  async function resolvePalette(nextSettings: ThemeSource): Promise<void> {
    const token = ++resolveToken;
    let color = parseColor(nextSettings.fixedColor) ?? parseColor(FALLBACK_THEME_COLOR);

    if (nextSettings.mode === "auto-from-icon") {
      try {
        color = await extractDominantColorFromImage(nextSettings.iconUrl);
      } catch (error) {
        console.warn(
          "YouTube custom theme color extraction failed; fixed color fallback is used.",
          error
        );
      }
    }

    if (token !== resolveToken || !settings || !color) {
      return;
    }

    palette = createTheme(color);
    applyTheme({ fullScan: true });
  }

  function applyTheme({
    fullScan = false,
    roots = []
  }: {
    fullScan?: boolean;
    roots?: Element[];
  } = {}): void {
    if (!palette || !targetDocument.documentElement) {
      return;
    }

    applyThemeVariables(palette);
    applyThemeStyles(palette);
    formatContentMetadata(targetDocument);

    if (fullScan) {
      applyThemedAttributes(palette, [targetDocument.documentElement]);
      return;
    }

    if (roots.length > 0) {
      applyThemedAttributes(palette, roots);
    }
  }

  function handleMutations(mutations: MutationRecord[]): void {
    if (!palette) {
      return;
    }

    mutations.forEach((mutation) => {
      if (mutation.type === "characterData" && mutation.target.parentElement) {
        formatContentMetadata(mutation.target.parentElement);
      }

      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          formatContentMetadata(node);

          if (node.isConnected) {
            pendingAttributeRoots.add(node);
          }
        }
      });
    });

    scheduleAttributeApply();
  }

  function scheduleAttributeApply(): void {
    if (isAttributeApplyScheduled || pendingAttributeRoots.size === 0) {
      return;
    }

    isAttributeApplyScheduled = true;
    window.setTimeout(() => {
      const roots = Array.from(pendingAttributeRoots);
      pendingAttributeRoots.clear();
      isAttributeApplyScheduled = false;
      applyTheme({ roots });
    }, 250);
  }

  return {
    enable(nextSettings: ThemeSource) {
      settings = nextSettings;

      if (!observer) {
        observer = new MutationObserver(handleMutations);
        observer.observe(targetDocument.documentElement, {
          childList: true,
          characterData: true,
          subtree: true
        });
      }

      void resolvePalette(nextSettings);
    },
    update(nextSettings: ThemeSource) {
      if (!nextSettings.enabled) {
        this.disable();
        return;
      }

      const sourceChanged =
        settings?.mode !== nextSettings.mode ||
        settings?.fixedColor !== nextSettings.fixedColor ||
        settings?.iconUrl !== nextSettings.iconUrl;

      settings = nextSettings;

      if (sourceChanged || !palette || !observer) {
        this.enable(nextSettings);
        return;
      }

      applyTheme();
    },
    disable() {
      resolveToken += 1;
      settings = null;
      palette = null;
      isAttributeApplyScheduled = false;
      pendingAttributeRoots.clear();
      observer?.disconnect();
      observer = null;
      removeThemeStyles();
      restoreThemeVariables();
      restoreThemedAttributes();
    }
  };

  function applyThemeVariables(nextPalette: ThemePalette): void {
    const rootStyle = targetDocument.documentElement.style;

    setThemeVariableGroup(THEME_VARIABLES.primary, nextPalette.primaryHex, rootStyle);
    setThemeVariableGroup(THEME_VARIABLES.alpha30, nextPalette.primaryAlpha30, rootStyle);
    setThemeVariableGroup(THEME_VARIABLES.alpha90, nextPalette.primaryAlpha90, rootStyle);
  }

  function setThemeVariableGroup(
    names: string[],
    value: string,
    rootStyle: CSSStyleDeclaration
  ): void {
    names.forEach((name) => {
      if (!cssVariableOriginals.has(name)) {
        cssVariableOriginals.set(name, rootStyle.getPropertyValue(name));
      }

      rootStyle.setProperty(name, value);
    });
  }

  function applyThemeStyles(nextPalette: ThemePalette): void {
    if (!targetDocument.head) {
      return;
    }

    let style = targetDocument.getElementById(THEME_STYLE_ID);

    if (!style) {
      style = targetDocument.createElement("style");
      style.id = THEME_STYLE_ID;
      targetDocument.head.appendChild(style);
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
      .ytSpecIconBadgeShapeTypeNotification .ytSpecIconBadgeShapeBadge,
      #notification-count {
        background-color: ${nextPalette.primaryHex} !important;
      }

      .ytp-hover-progress,
      .ytp-chapter-hover-container,
      .ytp-progress-bar-hover .ytp-hover-progress,
      .ytp-fine-scrubbing .ytp-hover-progress,
      .ytp-scrubber-pull-indicator,
      .ytp-heat-map-edu,
      .ytp-heat-map-chapter {
        background-color: ${nextPalette.primaryAlpha30} !important;
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
          ${nextPalette.primaryHex} 80%,
          ${nextPalette.primaryLightHex}
        ) !important;
      }

      .ytp-swatch-color {
        color: ${nextPalette.primaryHex} !important;
      }

      .ytContentMetadataViewModelLeadingIcon,
      ${CONTENT_METADATA_LEADING_ICON_SELECTOR} {
        display: none !important;
      }

      yt-content-metadata-view-model.ytContentMetadataViewModelHost {
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
      }

      .ytContentMetadataViewModelMetadataRow {
        display: flex !important;
        width: 100% !important;
        flex-basis: 100% !important;
        flex-wrap: wrap !important;
      }

      .ytContentMetadataViewModelDelimiter {
        display: inline !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .ytContentMetadataViewModelMetadataText {
        min-width: 0 !important;
        max-width: 100% !important;
        overflow: visible !important;
        text-overflow: clip !important;
        white-space: normal !important;
        overflow-wrap: anywhere !important;
        word-break: normal !important;
      }

      .ytContentMetadataViewModelMetadataText a,
      .ytContentMetadataViewModelMetadataText span {
        white-space: normal !important;
        overflow-wrap: anywhere !important;
        word-break: normal !important;
      }

      ytd-video-meta-block #metadata-line {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        flex-wrap: wrap !important;
      }

      ytd-video-meta-block #metadata-line > span {
        display: inline !important;
        min-width: 0 !important;
        max-width: 100% !important;
        overflow: visible !important;
        text-overflow: clip !important;
        white-space: normal !important;
        overflow-wrap: anywhere !important;
        word-break: normal !important;
      }

      ytd-video-meta-block #metadata-line > span + span::before {
        content: "・";
      }

      ytd-notification-topbar-button-renderer #notification-count,
      ytd-notification-renderer #notification-count,
      ytd-masthead #notification-count,
      ytd-topbar-menu-button-renderer #notification-count,
      yt-icon-button #notification-count,
      yt-notification-action-renderer #notification-count,
      yt-notification-action-renderer .notification-count,
      .ytSpecIconBadgeShapeTypeNotification .ytSpecIconBadgeShapeBadge,
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
        fill: ${nextPalette.primaryHex} !important;
        stop-color: ${nextPalette.primaryHex} !important;
      }

      tp-yt-paper-spinner .spinner-layer,
      paper-spinner-lite .spinner-layer {
        border-color: ${nextPalette.primaryHex} !important;
      }

      .ytp-volume-slider-handle,
      .ytp-volume-slider-handle::before,
      .ytp-volume-slider-handle::after {
        background-color: ${nextPalette.primaryLightHex} !important;
      }
    `;

    if (style.textContent !== cssText) {
      style.textContent = cssText;
    }
  }

  function formatContentMetadata(root: ParentNode): void {
    removeContentMetadataLeadingIcons(root);

    collectContentMetadataRoots(root).forEach((metadataRoot) => {
      formatViewCountLabels(metadataRoot);
    });
  }

  function removeContentMetadataLeadingIcons(root: ParentNode): void {
    if (
      root instanceof Element &&
      root.matches(CONTENT_METADATA_LEADING_ICON_SELECTOR)
    ) {
      root.remove();
      return;
    }

    root
      .querySelectorAll(CONTENT_METADATA_LEADING_ICON_SELECTOR)
      .forEach((element) => element.remove());
  }

  function collectContentMetadataRoots(root: ParentNode): Element[] {
    const roots = new Set<Element>();

    if (root instanceof Element) {
      const closestMetadata = root.closest(CONTENT_METADATA_SELECTOR);

      if (closestMetadata) {
        roots.add(closestMetadata);
      }

      if (root.matches(CONTENT_METADATA_SELECTOR)) {
        roots.add(root);
      }
    }

    root.querySelectorAll(CONTENT_METADATA_SELECTOR).forEach((element) => {
      roots.add(element);
    });

    return Array.from(roots);
  }

  function formatViewCountLabels(metadataRoot: Element): void {
    metadataRoot
      .querySelectorAll(".ytContentMetadataViewModelDelimiter")
      .forEach((delimiter) => {
        const viewCountElement = delimiter.previousElementSibling;

        if (delimiter.textContent !== "・") {
          delimiter.textContent = "・";
        }

        if (viewCountElement) {
          formatViewCountElement(viewCountElement);
        }
      });

    metadataRoot.querySelectorAll(LEGACY_VIEW_COUNT_SELECTOR).forEach((element) => {
      formatViewCountElement(element);
    });

    const textWalker = targetDocument.createTreeWalker(metadataRoot, 4);
    let currentNode = textWalker.nextNode();

    while (currentNode) {
      const nextValue = currentNode.nodeValue?.replaceAll("回視聴", "回再生") ?? null;

      if (nextValue !== currentNode.nodeValue) {
        currentNode.nodeValue = nextValue;
      }

      currentNode = textWalker.nextNode();
    }
  }

  function formatViewCountElement(element: Element): void {
    const text = element.textContent?.trim();

    if (!text) {
      return;
    }

    if (text.includes("回視聴")) {
      element.textContent = text.replaceAll("回視聴", "回再生");
      return;
    }

    if (/^[\d０-９][\d０-９.,，]*\s*(?:万|億)?$/.test(text)) {
      element.textContent = `${text}回再生`;
    }
  }

  function applyThemedAttributes(nextPalette: ThemePalette, roots: Element[]): void {
    roots.forEach((root) => {
      collectThemeAttributeElements(root).forEach((element) => {
        THEME_ATTRIBUTE_NAMES.forEach((name) => {
          const value = getOriginalOrCurrentAttribute(element, name);

          if (!isThemeableRed(value)) {
            return;
          }

          rememberAttribute(element, name);
          element.setAttribute(name, nextPalette.primaryHex);
        });
      });
    });
  }

  function collectThemeAttributeElements(root: Element): Element[] {
    const elements: Element[] = [];

    if (root.matches(THEME_ATTRIBUTE_SELECTOR)) {
      elements.push(root);
    }

    root.querySelectorAll(THEME_ATTRIBUTE_SELECTOR).forEach((element) => {
      elements.push(element);
    });

    return elements;
  }

  function getOriginalOrCurrentAttribute(
    element: Element,
    name: AttributeName
  ): string | null {
    return attributeOriginals.get(element)?.get(name) ?? element.getAttribute(name);
  }

  function rememberAttribute(element: Element, name: AttributeName): void {
    let elementOriginals = attributeOriginals.get(element);

    if (!elementOriginals) {
      elementOriginals = new Map();
      attributeOriginals.set(element, elementOriginals);
    }

    if (!elementOriginals.has(name)) {
      elementOriginals.set(name, element.getAttribute(name));
    }
  }

  function removeThemeStyles(): void {
    targetDocument.getElementById(THEME_STYLE_ID)?.remove();
  }

  function restoreThemeVariables(): void {
    const rootStyle = targetDocument.documentElement.style;

    cssVariableOriginals.forEach((value, name) => {
      if (value) {
        rootStyle.setProperty(name, value);
      } else {
        rootStyle.removeProperty(name);
      }
    });
    cssVariableOriginals.clear();
  }

  function restoreThemedAttributes(): void {
    attributeOriginals.forEach((attributes, element) => {
      attributes.forEach((value, name) => {
        if (value === null) {
          element.removeAttribute(name);
        } else {
          element.setAttribute(name, value);
        }
      });
    });
    attributeOriginals.clear();
  }
}
