import { describe, it, expect } from "vitest";
import { isInteractionEntry } from "../src/common/item-interactions.mjs";

describe("isInteractionEntry", () => {
  it("treats consumables and tools as interactions", () => {
    expect(isInteractionEntry({ type: "consumable" }, null, "action")).toBe(true);
    expect(isInteractionEntry({ type: "tool" }, null, "bonus")).toBe(true);
  });

  it("treats special activation and utilize activities as interactions", () => {
    expect(isInteractionEntry({ type: "equipment" }, { type: "utilize" }, "action")).toBe(true);
    expect(isInteractionEntry({ type: "weapon" }, null, "special")).toBe(true);
  });

  it("keeps weapon attacks in the action section", () => {
    expect(isInteractionEntry({ type: "weapon" }, { type: "attack" }, "action")).toBe(false);
    expect(isInteractionEntry({ type: "spell" }, { type: "cast" }, "action")).toBe(false);
  });
});
