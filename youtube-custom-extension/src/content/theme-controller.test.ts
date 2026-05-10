import { afterEach, describe, expect, it, vi } from "vitest";

import { createThemeController } from "./theme-controller";

describe("themeController", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes styles, variables, and restores changed svg attributes when disabled", async () => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "#ff0033");
    document.body.appendChild(path);

    const controller = createThemeController(document);
    controller.update({
      enabled: true,
      mode: "fixed-color",
      fixedColor: "#00aa88",
      iconUrl: "https://example.com/icon.png"
    });

    await Promise.resolve();

    expect(document.getElementById("youtube-custom-theme-style")).toBeInTheDocument();
    const appliedColor = document.documentElement.style.getPropertyValue(
      "--yt-spec-static-brand-red"
    );

    expect(appliedColor).not.toBe("");
    expect(appliedColor).not.toBe("#ff0033");
    expect(path.getAttribute("fill")).toBe(appliedColor);

    controller.disable();

    expect(document.getElementById("youtube-custom-theme-style")).not.toBeInTheDocument();
    expect(document.documentElement.style.getPropertyValue("--yt-spec-static-brand-red")).toBe(
      ""
    );
    expect(path.getAttribute("fill")).toBe("#ff0033");
  });

  it("themes only newly added svg attributes after initial application", async () => {
    vi.useFakeTimers();

    const initialPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    initialPath.setAttribute("fill", "#ff0033");
    document.body.appendChild(initialPath);

    const controller = createThemeController(document);
    controller.update({
      enabled: true,
      mode: "fixed-color",
      fixedColor: "#00aa88",
      iconUrl: "https://example.com/icon.png"
    });

    await Promise.resolve();
    const appliedColor = document.documentElement.style.getPropertyValue(
      "--yt-spec-static-brand-red"
    );
    const addedPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    addedPath.setAttribute("fill", "#ff0033");
    document.body.appendChild(addedPath);

    await Promise.resolve();
    vi.advanceTimersByTime(250);

    expect(initialPath.getAttribute("fill")).toBe(appliedColor);
    expect(addedPath.getAttribute("fill")).toBe(appliedColor);

    controller.disable();
  });

  it("removes content metadata leading icons and formats the views row without a bullet", async () => {
    const leadingIcon = document.createElement("span");
    leadingIcon.className = "ytIconWrapperHost ytContentMetadataViewModelLeadingIcon";
    document.body.appendChild(leadingIcon);

    const controller = createThemeController(document);
    controller.update({
      enabled: true,
      mode: "fixed-color",
      fixedColor: "#00aa88",
      iconUrl: "https://example.com/icon.png"
    });

    await Promise.resolve();

    expect(
      document.querySelector(".ytIconWrapperHost.ytContentMetadataViewModelLeadingIcon")
    ).not.toBeInTheDocument();

    const cssText =
      document.getElementById("youtube-custom-theme-style")?.textContent ?? "";

    expect(cssText).toContain(".ytContentMetadataViewModelDelimiter");
    expect(cssText).toContain('content: " "');

    controller.disable();
  });

  it("removes content metadata leading icons added after theme application", async () => {
    vi.useFakeTimers();

    const controller = createThemeController(document);
    controller.update({
      enabled: true,
      mode: "fixed-color",
      fixedColor: "#00aa88",
      iconUrl: "https://example.com/icon.png"
    });

    await Promise.resolve();

    const metadata = document.createElement("div");
    metadata.innerHTML =
      '<span class="ytIconWrapperHost ytContentMetadataViewModelLeadingIcon"></span>';
    document.body.appendChild(metadata);

    await Promise.resolve();

    expect(
      document.querySelector(".ytIconWrapperHost.ytContentMetadataViewModelLeadingIcon")
    ).not.toBeInTheDocument();

    controller.disable();
  });
});
