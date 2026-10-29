// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { installFoundry } from "./helpers.mjs";
import {
  MAX_AURAS,
  auraRadiusPixels,
  readTokenAuras,
  writeTokenAuras,
  DEFAULT_AURA_COLOR
} from "../src/components/token-aura/token-aura.mjs";
import {
  addTokenAura,
  applyAuraColor,
  applyAuraFeet,
  buildAuraDropdownContext,
  selectAuraSlot
} from "../src/components/token-aura/token-aura-picker.mjs";

function makeAuraDoc(initial = {}) {
  const flags = { ...initial };
  return {
    canUserModify: () => true,
    getFlag: (_scope, key) => flags[key],
    setFlag: vi.fn(async (_scope, key, value) => { flags[key] = value; }),
    unsetFlag: vi.fn(async (_scope, key) => { delete flags[key]; })
  };
}

describe("token aura", () => {
  beforeEach(() => {
    installFoundry();
    globalThis.game.user = { isGM: true, id: "gm" };
    globalThis.ui = { notifications: { warn: vi.fn() } };
    selectAuraSlot(0);
  });

  it("reads no auras as empty", () => {
    expect(readTokenAuras({})).toEqual([]);
  });

  it("migrates a single legacy aura flag", () => {
    const doc = makeAuraDoc({ aura: { feet: 15, color: "#4090e0" } });
    expect(readTokenAuras(doc)).toEqual([
      { index: 0, feet: 15, color: "#4090e0", on: true }
    ]);
  });

  it("measures a true circle from the grid", () => {
    expect(auraRadiusPixels(10, { distance: 5, size: 100 })).toBe(200);
    expect(auraRadiusPixels(0, { distance: 5, size: 100 })).toBe(0);
  });

  it("stores auras as a list and clears them with off", async () => {
    const doc = makeAuraDoc();
    await writeTokenAuras({ document: doc }, [{ feet: 15, color: "#4090e0" }]);
    expect(doc.getFlag("illusive-combat-hud", "auras")).toEqual([
      { feet: 15, color: "#4090e0" }
    ]);

    await applyAuraFeet({ document: doc }, 0);
    expect(doc.getFlag("illusive-combat-hud", "auras")).toBeUndefined();
  });

  it("adds a second and third aura, then stops", async () => {
    const doc = makeAuraDoc();
    await applyAuraFeet({ document: doc }, 10);
    await addTokenAura({ document: doc });
    await addTokenAura({ document: doc });
    const blocked = await addTokenAura({ document: doc });
    const auras = readTokenAuras(doc);
    expect(auras).toHaveLength(MAX_AURAS);
    expect(blocked).toBe(false);
    expect(buildAuraDropdownContext({ document: doc }).canAdd).toBe(false);
  });

  it("edits the selected slot without changing the others", async () => {
    const doc = makeAuraDoc();
    await writeTokenAuras({ document: doc }, [
      { feet: 10, color: "#e07020" },
      { feet: 20, color: "#4090e0" }
    ]);
    selectAuraSlot(1);
    await applyAuraFeet({ document: doc }, 30);
    await applyAuraColor({ document: doc }, "#40b060");
    expect(readTokenAuras(doc)).toEqual([
      { index: 0, feet: 10, color: "#e07020", on: true },
      { index: 1, feet: 30, color: "#40b060", on: true }
    ]);
  });

  it("turns a color pick on at 10 ft when none exist", async () => {
    const doc = makeAuraDoc();
    await applyAuraColor({ document: doc }, "#40b060");
    expect(readTokenAuras(doc)[0]).toMatchObject({ feet: 10, color: "#40b060" });
  });

  it("marks the matching size on the selected aura", () => {
    const ctx = buildAuraDropdownContext({
      document: makeAuraDoc({ auras: [{ feet: 10, color: DEFAULT_AURA_COLOR }] })
    });
    expect(ctx.feet.find((c) => c.feet === 10).isActive).toBe(true);
    expect(ctx.offActive).toBe(false);
    expect(ctx.feetValue).toBe(10);
    expect(ctx.colors.find((c) => c.color === DEFAULT_AURA_COLOR).isActive).toBe(true);
    expect(ctx.slots).toHaveLength(1);
    expect(ctx.canAdd).toBe(true);
  });

  it("accepts a typed radius and any hex color", async () => {
    const doc = makeAuraDoc();
    await applyAuraFeet({ document: doc }, 12);
    await applyAuraColor({ document: doc }, "#a1b2c3");
    expect(readTokenAuras(doc)[0]).toMatchObject({ feet: 12, color: "#a1b2c3" });
    expect(buildAuraDropdownContext({ document: doc }).customColor).toBe(true);
  });
});
