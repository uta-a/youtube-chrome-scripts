import { describe, expect, it } from "vitest";

import { createShortcutController } from "./shortcut-controller";

describe("shortcutController", () => {
  it("dispatches arrow keys for configured shortcuts", () => {
    const controller = createShortcutController(document);
    const dispatched: string[] = [];
    document.addEventListener("keydown", (event) => dispatched.push(event.key));

    controller.update({ enabled: true, backKey: "j", forwardKey: "l" });
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "j", bubbles: true, cancelable: true })
    );
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "l", bubbles: true, cancelable: true })
    );

    expect(dispatched).toEqual(["ArrowLeft", "ArrowRight"]);
    controller.disable();
  });

  it("ignores editable targets and modifier shortcuts", () => {
    const controller = createShortcutController(document);
    const dispatchedArrowKeys: string[] = [];
    const input = document.createElement("input");
    document.body.appendChild(input);
    document.addEventListener("keydown", (event) => {
      if (event.key.startsWith("Arrow")) {
        dispatchedArrowKeys.push(event.key);
      }
    });

    controller.update({ enabled: true, backKey: "j", forwardKey: "l" });
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "j", bubbles: true, cancelable: true })
    );
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "l",
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      })
    );

    expect(dispatchedArrowKeys).toEqual([]);
    controller.disable();
  });

  it("does not register duplicate listeners when settings are updated", () => {
    const controller = createShortcutController(document);
    const dispatched: string[] = [];
    document.addEventListener("keydown", (event) => dispatched.push(event.key));

    controller.update({ enabled: true, backKey: "j", forwardKey: "l" });
    controller.update({ enabled: true, backKey: "j", forwardKey: "l" });
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "j", bubbles: true, cancelable: true })
    );

    expect(dispatched).toEqual(["ArrowLeft"]);
    controller.disable();
  });
});
