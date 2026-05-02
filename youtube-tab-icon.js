(function () {
  const ICON_URL = "https://i.imgur.com/smncvp9.png";

  function removeCurrentTabIcons() {
    document
      .querySelectorAll("link[rel='icon'], link[rel='shortcut icon']")
      .forEach((link) => link.remove());
  }

  function createTabIconLink() {
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    link.href = ICON_URL;

    return link;
  }

  function changeTabIcon() {
    if (!document.head) {
      return;
    }

    removeCurrentTabIcons();
    document.head.appendChild(createTabIconLink());
  }

  changeTabIcon();

  const observer = new MutationObserver(() => {
    const currentIcon = document.querySelector(
      `link[rel='icon'][href='${ICON_URL}']`
    );

    if (!currentIcon) {
      changeTabIcon();
    }
  });

  observer.observe(document.head || document.documentElement, {
    childList: true,
    subtree: true,
  });

  console.info("YouTube tab icon changed");
})();
