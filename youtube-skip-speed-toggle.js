(function () {
  const MODE = {
    SKIP: "skip",
    SPEED_BURST: "speed-burst",
  };
  const MODE_LABEL = {
    [MODE.SKIP]: "skip",
    [MODE.SPEED_BURST]: "speed burst",
  };
  const KEY_MAP = {
    j: {
      key: "ArrowLeft",
      code: "ArrowLeft",
      keyCode: 37,
    },
    l: {
      key: "ArrowRight",
      code: "ArrowRight",
      keyCode: 39,
    },
  };
  const SPEED_KEYS = new Set(Object.keys(KEY_MAP));
  const BURST_RATE = 5;
  const BURST_DURATION_MS = 1000;
  const SEEK_BAR_VISIBLE_MS = 1200;
  const SEEK_BAR_STYLE_ID = "youtube-custom-seekbar-style";
  const SEEK_BAR_VISIBLE_CLASS = "youtube-custom-seekbar-visible";
  const MODE_OVERLAY_ID = "youtube-custom-mode-overlay";
  const MODE_OVERLAY_VISIBLE_CLASS = "youtube-custom-mode-overlay-visible";
  const MODE_OVERLAY_VISIBLE_MS = 900;
  const SPEED_OVERLAY_ID = "youtube-custom-speedmaster-overlay";
  const SPEED_OVERLAY_VISIBLE_CLASS = "youtube-custom-speedmaster-visible";

  let currentMode = MODE.SKIP;
  let restoreSpeedTimer = null;
  let hideSeekBarTimer = null;
  let hideOverlayTimer = null;
  let hideSpeedOverlayTimer = null;
  let previousPlaybackRate = null;

  function isEditableTarget(target) {
    if (!(target instanceof Element)) {
      return false;
    }

    return Boolean(
      target.closest("input, textarea, select, [contenteditable='true']")
    );
  }

  function findVideo() {
    return document.getElementsByClassName("video-stream html5-main-video")[0];
  }

  function findPlayer() {
    return document.querySelector(".html5-video-player");
  }

  function ensureSeekBarStyle() {
    if (document.getElementById(SEEK_BAR_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = SEEK_BAR_STYLE_ID;
    style.textContent = `
      .${SEEK_BAR_VISIBLE_CLASS} .ytp-chrome-bottom,
      .${SEEK_BAR_VISIBLE_CLASS} .ytp-progress-bar-container,
      .${SEEK_BAR_VISIBLE_CLASS} .ytp-progress-bar,
      .${SEEK_BAR_VISIBLE_CLASS} .ytp-chrome-controls {
        opacity: 1 !important;
        visibility: visible !important;
        display: block !important;
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureSpeedOverlayStyle() {
    if (document.getElementById(SPEED_OVERLAY_ID + "-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = SPEED_OVERLAY_ID + "-style";
    style.textContent = `
      #${SPEED_OVERLAY_ID} {
        display: block !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 120ms ease !important;
      }

      #${SPEED_OVERLAY_ID}.${SPEED_OVERLAY_VISIBLE_CLASS} {
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(style);
  }

  function getSpeedOverlay() {
    ensureSpeedOverlayStyle();

    const player = findPlayer();
    const overlayParent = player || document.body || document.documentElement;
    let overlay = document.getElementById(SPEED_OVERLAY_ID);

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = SPEED_OVERLAY_ID;
      overlay.className = "ytp-overlay ytp-speedmaster-overlay";
      overlay.appendChild(createSpeedOverlayContent());
      overlayParent.appendChild(overlay);
    } else if (overlay.parentElement !== overlayParent) {
      overlayParent.appendChild(overlay);
    }

    return overlay;
  }

  function createSpeedOverlayContent() {
    const container = document.createElement("div");
    const label = document.createElement("div");
    const icon = document.createElement("div");

    container.className = "ytp-speedmaster-user-edu ytp-speedmaster-has-icon";
    label.className = "ytp-speedmaster-label";
    label.textContent = "5 倍";
    icon.className = "ytp-speedmaster-icon";

    container.appendChild(label);
    container.appendChild(icon);

    return container;
  }

  function showSpeedOverlay() {
    const overlay = getSpeedOverlay();
    const label = overlay.querySelector(".ytp-speedmaster-label");

    if (label) {
      label.textContent = "5 倍";
    }

    overlay.classList.add(SPEED_OVERLAY_VISIBLE_CLASS);

    if (hideSpeedOverlayTimer) {
      window.clearTimeout(hideSpeedOverlayTimer);
    }

    hideSpeedOverlayTimer = window.setTimeout(function hideSpeedOverlay() {
      overlay.classList.remove(SPEED_OVERLAY_VISIBLE_CLASS);
      hideSpeedOverlayTimer = null;
    }, BURST_DURATION_MS);
  }

  function ensureOverlayStyle() {
    if (document.getElementById(MODE_OVERLAY_ID + "-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = MODE_OVERLAY_ID + "-style";
    style.textContent = `
      #${MODE_OVERLAY_ID} {
        position: fixed;
        left: 50%;
        top: 50%;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        min-width: 180px;
        padding: 18px 22px;
        border-radius: 14px;
        color: #ffffff;
        background: rgba(15, 18, 24, 0.86);
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);
        font-family: Roboto, Arial, sans-serif;
        opacity: 0;
        pointer-events: none;
        transform: translate(-50%, -50%) scale(0.96);
        transition: opacity 140ms ease, transform 140ms ease;
        backdrop-filter: blur(10px);
      }

      #${MODE_OVERLAY_ID}.${MODE_OVERLAY_VISIBLE_CLASS} {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }

      .html5-video-player > #${MODE_OVERLAY_ID} {
        position: absolute;
      }

      #${MODE_OVERLAY_ID} .youtube-custom-mode-title {
        color: rgba(255, 255, 255, 0.72);
        font-size: 12px;
        font-weight: 500;
        letter-spacing: 0;
      }

      #${MODE_OVERLAY_ID} .youtube-custom-mode-label {
        font-size: 24px;
        font-weight: 700;
        line-height: 1.1;
        letter-spacing: 0;
      }
    `;
    document.head.appendChild(style);
  }

  function getModeOverlay() {
    ensureOverlayStyle();

    let overlay = document.getElementById(MODE_OVERLAY_ID);
    const player = findPlayer();
    const overlayParent = player || document.body || document.documentElement;

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = MODE_OVERLAY_ID;
      overlay.setAttribute("role", "status");
      overlay.setAttribute("aria-live", "polite");
      overlay.appendChild(createModeOverlayTitle());
      overlay.appendChild(createModeOverlayLabel());
      overlayParent.appendChild(overlay);
    } else if (overlay.parentElement !== overlayParent) {
      overlayParent.appendChild(overlay);
    }

    return overlay;
  }

  function createModeOverlayTitle() {
    const title = document.createElement("span");

    title.className = "youtube-custom-mode-title";
    title.textContent = "Mode switched";

    return title;
  }

  function createModeOverlayLabel() {
    const label = document.createElement("span");

    label.className = "youtube-custom-mode-label";

    return label;
  }

  function showModeOverlay() {
    const overlay = getModeOverlay();
    const label = overlay.querySelector(".youtube-custom-mode-label");

    if (label) {
      label.textContent = MODE_LABEL[currentMode];
    }

    overlay.classList.add(MODE_OVERLAY_VISIBLE_CLASS);

    if (hideOverlayTimer) {
      window.clearTimeout(hideOverlayTimer);
    }

    hideOverlayTimer = window.setTimeout(function hideModeOverlay() {
      overlay.classList.remove(MODE_OVERLAY_VISIBLE_CLASS);
      hideOverlayTimer = null;
    }, MODE_OVERLAY_VISIBLE_MS);
  }

  function showSeekBar() {
    const player = findPlayer();

    if (!player) {
      return;
    }

    ensureSeekBarStyle();
    player.classList.add(SEEK_BAR_VISIBLE_CLASS);
    player.classList.remove("ytp-autohide");
    player.dispatchEvent(
      new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );

    if (hideSeekBarTimer) {
      window.clearTimeout(hideSeekBarTimer);
    }

    hideSeekBarTimer = window.setTimeout(function hideSeekBar() {
      player.classList.remove(SEEK_BAR_VISIBLE_CLASS);
      hideSeekBarTimer = null;
    }, SEEK_BAR_VISIBLE_MS);
  }

  function dispatchArrowKey(keyConfig) {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: keyConfig.key,
        code: keyConfig.code,
        keyCode: keyConfig.keyCode,
        which: keyConfig.keyCode,
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window,
      })
    );
  }

  function applySpeedBurst(video) {
    if (restoreSpeedTimer) {
      window.clearTimeout(restoreSpeedTimer);
    }

    if (previousPlaybackRate === null) {
      previousPlaybackRate = video.playbackRate;
    }

    video.playbackRate = BURST_RATE;
    showSpeedOverlay();

    restoreSpeedTimer = window.setTimeout(function restorePlaybackRate() {
      video.playbackRate = previousPlaybackRate;
      previousPlaybackRate = null;
      restoreSpeedTimer = null;
    }, BURST_DURATION_MS);
  }

  function toggleMode() {
    currentMode =
      currentMode === MODE.SKIP ? MODE.SPEED_BURST : MODE.SKIP;
    showSeekBar();
    showModeOverlay();
    console.info(
      "YouTube custom skip/speed mode:",
      MODE_LABEL[currentMode]
    );
  }

  document.addEventListener(
    "keydown",
    function handleKeyDown(event) {
      if (isEditableTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (event.shiftKey && (event.key === "Tab" || event.code === "Tab")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        toggleMode();
        return;
      }

      const key = event.key.toLowerCase();

      if (!SPEED_KEYS.has(key)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      showSeekBar();

      if (currentMode === MODE.SKIP) {
        dispatchArrowKey(KEY_MAP[key]);
        return;
      }

      const video = findVideo();

      if (video) {
        applySpeedBurst(video);
      }
    },
    true
  );

  console.info(
    "YouTube custom skip/speed loaded: j/l action, Shift+Tab toggles mode"
  );
})();
