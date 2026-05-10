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

  it("removes content metadata leading icons and formats content metadata", async () => {
    const leadingIcon = document.createElement("span");
    leadingIcon.className = "ytIconWrapperHost ytContentMetadataViewModelLeadingIcon";
    const metadata = document.createElement("yt-content-metadata-view-model");
    metadata.className = "ytContentMetadataViewModelHost";
    metadata.innerHTML = `
      <div class="ytContentMetadataViewModelMetadataRow">
        <span class="ytContentMetadataViewModelMetadataText">Example Channel</span>
      </div>
      <div class="ytContentMetadataViewModelMetadataRow">
        <span class="ytContentMetadataViewModelMetadataText">521万回視聴</span>
        <span class="ytContentMetadataViewModelDelimiter"> • </span>
        <span class="ytContentMetadataViewModelMetadataText">4 年前</span>
      </div>
    `;
    metadata.appendChild(leadingIcon);
    document.body.appendChild(metadata);

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
    const compactText = document.body.textContent?.replace(/\s+/g, "") ?? "";

    expect(document.body.textContent).toContain("521万回再生");
    expect(compactText).toContain("521万回再生・4年前");
    expect(document.body.textContent).not.toContain("521万回視聴");

    const cssText =
      document.getElementById("youtube-custom-theme-style")?.textContent ?? "";

    expect(cssText).toContain("flex-direction: column");
    expect(cssText).toContain("flex-wrap: nowrap");
    expect(cssText).toContain("flex-basis: 100%");
    expect(cssText).toContain(".ytContentMetadataViewModelDelimiter");
    expect(cssText).toContain('content: "・"');
    expect(cssText).toContain("ytd-video-meta-block #metadata-line");

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

  it("formats view labels added after theme application", async () => {
    vi.useFakeTimers();

    const controller = createThemeController(document);
    controller.update({
      enabled: true,
      mode: "fixed-color",
      fixedColor: "#00aa88",
      iconUrl: "https://example.com/icon.png"
    });

    await Promise.resolve();

    const metadata = document.createElement("yt-content-metadata-view-model");
    metadata.innerHTML =
      '<span class="ytContentMetadataViewModelMetadataText">33万回視聴</span>';
    document.body.appendChild(metadata);

    await Promise.resolve();

    expect(document.body.textContent).toContain("33万回再生");
    expect(document.body.textContent).not.toContain("33万回視聴");

    controller.disable();
  });

  it("formats legacy metadata view counts without a suffix", async () => {
    const metadata = document.createElement("ytd-video-meta-block");
    metadata.innerHTML = `
      <div id="metadata-line">
        <span>521万</span>
        <span>4 年前</span>
      </div>
    `;
    document.body.appendChild(metadata);

    const controller = createThemeController(document);
    controller.update({
      enabled: true,
      mode: "fixed-color",
      fixedColor: "#00aa88",
      iconUrl: "https://example.com/icon.png"
    });

    await Promise.resolve();

    expect(document.body.textContent).toContain("521万回再生");
    expect(document.body.textContent).toContain("4 年前");

    controller.disable();
  });
});
