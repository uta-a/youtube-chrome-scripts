(function () {
  const SPEED_KEYS = new Set(["j", "l"]);
  const BURST_RATE = 5;
  const BURST_DURATION_MS = 1000;
  const SPEED_OVERLAY_ID = "youtube-custom-speedmaster-overlay";
  const SPEED_OVERLAY_VISIBLE_CLASS = "youtube-custom-speedmaster-visible";
  let restoreTimer = null;
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

  function applySpeedBurst(video) {
    if (restoreTimer) {
      window.clearTimeout(restoreTimer);
    }

    if (previousPlaybackRate === null) {
      previousPlaybackRate = video.playbackRate;
    }

    video.playbackRate = BURST_RATE;
    showSpeedOverlay();

    restoreTimer = window.setTimeout(function restorePlaybackRate() {
      video.playbackRate = previousPlaybackRate;
      previousPlaybackRate = null;
      restoreTimer = null;
    }, BURST_DURATION_MS);
  }

  document.addEventListener(
    "keydown",
    function handleKeyDown(event) {
      if (
        isEditableTarget(event.target) ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      if (!SPEED_KEYS.has(key)) {
        return;
      }

      const video = findVideo();

      if (!video) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      applySpeedBurst(video);
    },
    true
  );

  console.info("YouTube custom speed burst loaded: j/l set 5x for 1s");
})();
