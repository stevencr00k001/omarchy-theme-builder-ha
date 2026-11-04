import { describe, expect, it } from "vitest";
import {
  findEmbeddedHass,
  isSameOriginFrame,
  resolveEmbeddedHass,
  saveThemeMessage,
  userThemeMessage,
  type EmbeddedWindow,
} from "@/lib/embedded";

function frame(parent: EmbeddedWindow): EmbeddedWindow {
  const win: EmbeddedWindow = { parent };
  return win;
}

describe("embedded Home Assistant detection", () => {
  it("ignores a top-level window", () => {
    const win: EmbeddedWindow = {};
    win.parent = win;
    expect(isSameOriginFrame(win)).toBe(false);
    expect(findEmbeddedHass(win)).toBeNull();
  });

  it("uses the parent home-assistant element when it can call the websocket", async () => {
    const calls: unknown[] = [];
    const hass = {
      callWS: async (message: Record<string, unknown>) => {
        calls.push(message);
        return { ok: true };
      },
    };
    const parent: EmbeddedWindow = {
      document: {
        querySelector: (selector: string) => (selector === "home-assistant" ? { hass } : null),
      },
    };
    const win = frame(parent);
    expect(isSameOriginFrame(win)).toBe(true);
    const found = findEmbeddedHass(win);
    expect(found).not.toBeNull();
    await found!.callWS({ type: "omarchy_themes/status" });
    expect(calls).toEqual([{ type: "omarchy_themes/status" }]);
  });

  it("falls back to hassConnection.sendMessagePromise", async () => {
    const calls: unknown[] = [];
    const parent: EmbeddedWindow = {
      hassConnection: Promise.resolve({
        sendMessagePromise: async (message: Record<string, unknown>) => {
          calls.push(message);
          return { installed: true };
        },
      }),
    };
    const win = frame(parent);
    const found = await resolveEmbeddedHass(win);
    expect(found).not.toBeNull();
    await found!.callWS({ type: "omarchy_themes/status" });
    expect(calls[0]).toEqual({ type: "omarchy_themes/status" });
  });

  it("treats a cross-origin parent as standalone", () => {
    const parent = {};
    Object.defineProperty(parent, "document", {
      get() {
        throw new Error("Blocked a frame with origin");
      },
    });
    const win = frame(parent as EmbeddedWindow);
    expect(isSameOriginFrame(win)).toBe(false);
    expect(findEmbeddedHass(win)).toBeNull();
  });

  it("saves without setting the system default, then selects the user theme", () => {
    expect(
      saveThemeMessage({
        filename: "omarchy-nord-frosted.yaml",
        yaml: "theme: {}",
        imageFilename: "nord--city.webp",
        imageBase64: "abc",
        setForUser: true,
        dark: true,
      }),
    ).toEqual({
      type: "omarchy_themes/save",
      filename: "omarchy-nord-frosted.yaml",
      yaml: "theme: {}",
      image_filename: "nord--city.webp",
      image_base64: "abc",
      activate: false,
      set_for_user: true,
      dark: true,
    });
    expect(saveThemeMessage({ filename: "omarchy-nord.yaml", yaml: "a: b" })).not.toHaveProperty("user_id");
    expect(userThemeMessage("Omarchy Nord - Frosted glass", true)).toEqual({
      type: "frontend/set_user_data",
      key: "theme",
      value: { theme: "Omarchy Nord - Frosted glass", dark: true },
    });
  });
});
