import { describe, expect, it } from "vitest";

import { createTabIconController } from "./tab-icon-controller";

describe("tabIconController", () => {
  it("applies a custom favicon and removes it when disabled", () => {
    const original = document.createElement("link");
    original.rel = "icon";
    original.href = "https://www.youtube.com/favicon.ico";
    document.head.appendChild(original);

    const controller = createTabIconController(document);
    controller.update({
      enabled: true,
      iconUrl: "https://example.com/custom.png"
    });

    const customIcon = document.querySelector<HTMLLinkElement>(
      "link[data-youtube-custom-icon='true']"
    );

    expect(customIcon).toBeInTheDocument();
    expect(customIcon?.href).toBe("https://example.com/custom.png");
    expect(document.querySelector("link[href='https://www.youtube.com/favicon.ico']")).toBe(
      null
    );

    controller.disable();

    expect(document.querySelector("link[data-youtube-custom-icon='true']")).toBe(null);
  });
});
