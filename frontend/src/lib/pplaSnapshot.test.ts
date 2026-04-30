import { beforeEach, describe, expect, it } from "vitest";
import { applyPplaSnapshot, getPplaSnapshot } from "./pplaSnapshot";

describe("pplaSnapshot", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("collects only ppla_ keys", () => {
    window.localStorage.setItem("ppla_note_a", "x");
    window.localStorage.setItem("random_key", "y");

    const snapshot = getPplaSnapshot();
    expect(snapshot).toEqual({ ppla_note_a: "x" });
  });

  it("replaces existing ppla_ keys with incoming snapshot", () => {
    window.localStorage.setItem("ppla_old", "1");
    window.localStorage.setItem("keep_me", "ok");

    applyPplaSnapshot({
      ppla_new: "2"
    });

    expect(window.localStorage.getItem("ppla_old")).toBeNull();
    expect(window.localStorage.getItem("ppla_new")).toBe("2");
    expect(window.localStorage.getItem("keep_me")).toBe("ok");
  });
});
