(function () {
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

  function isEditableTarget(target) {
    if (!(target instanceof Element)) {
      return false;
    }

    return Boolean(
      target.closest("input, textarea, select, [contenteditable='true']")
    );
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

  document.addEventListener(
    "keydown",
    function handleKeyDown(event) {
      if (isEditableTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      const key = event.key.toLowerCase();
      const keyConfig = KEY_MAP[key];

      if (!keyConfig) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      dispatchArrowKey(keyConfig);
    },
    true
  );

  console.info("YouTube custom skip loaded: j/l dispatch ArrowLeft/ArrowRight");
})();
