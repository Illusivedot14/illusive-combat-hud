import { describe, it, expect, beforeEach } from "vitest";
import { installFoundry, makeActor } from "./helpers.mjs";
import {
  getPactMagic,
  getClassResources,
  buildActionBarResources,
  buildSpellSlotDiamondsForLevel,
  hasAvailableSpellSlot
} from "../src/common/actor-resources.mjs";

describe("getPactMagic", () => {
  beforeEach(() => installFoundry());

  it("returns null without pact slots", () => {
    expect(getPactMagic(makeActor())).toBeNull();
  });

  it("reads pact pool and level", () => {
    const actor = makeActor({
      system: {
        spells: { pact: { value: 1, max: 2, level: 3 } }
      }
    });
    const pact = getPactMagic(actor);
    expect(pact).toMatchObject({ id: "pact", kind: "pact", value: 1, max: 2, level: 3 });
    expect(pact.diamonds).toEqual([{ filled: true }, { filled: false }]);
  });
});

describe("getClassResources", () => {
  beforeEach(() => installFoundry());

  it("includes primary/secondary/tertiary with max", () => {
    const actor = makeActor({
      system: {
        resources: {
          primary: { label: "Ki", value: 2, max: 4 },
          secondary: { label: "", value: 0, max: 0 },
          tertiary: { label: "Sorcery", value: 1, max: 3 }
        }
      }
    });
    const list = getClassResources(actor);
    expect(list.map((r) => r.id)).toEqual(["primary", "tertiary"]);
    expect(list[0]).toMatchObject({ label: "Ki", value: 2, max: 4 });
  });

  it("skips legendary actions but keeps resistance", () => {
    const actor = makeActor({
      system: {
        resources: {
          legact: { value: 1, max: 3 },
          legres: { value: 2, max: 3 }
        }
      }
    });
    const list = getClassResources(actor);
    expect(list.map((r) => r.id)).toEqual(["legres"]);
  });
});

describe("buildSpellSlotDiamondsForLevel", () => {
  beforeEach(() => installFoundry());

  it("uses prepared slots when present", () => {
    const actor = makeActor({
      system: {
        spells: {
          spell1: { value: 2, max: 3 },
          pact: { value: 1, max: 2, level: 1 }
        }
      }
    });
    expect(buildSpellSlotDiamondsForLevel(actor, 1)).toEqual([
      { filled: true },
      { filled: true },
      { filled: false }
    ]);
  });

  it("falls back to pact when leveled slots are empty", () => {
    const actor = makeActor({
      system: {
        spells: {
          spell1: { value: 0, max: 0 },
          pact: { value: 2, max: 2, level: 3 }
        }
      }
    });
    expect(buildSpellSlotDiamondsForLevel(actor, 2)).toEqual([
      { filled: true },
      { filled: true }
    ]);
    expect(buildSpellSlotDiamondsForLevel(actor, 5)).toBeNull();
  });
});

describe("hasAvailableSpellSlot", () => {
  beforeEach(() => installFoundry());

  it("accepts pact for spellN keys within pact level", () => {
    const actor = makeActor({
      system: {
        spells: {
          spell2: { value: 0, max: 0 },
          pact: { value: 1, max: 2, level: 3 }
        }
      }
    });
    expect(hasAvailableSpellSlot(actor, "spell2")).toBe(true);
    expect(hasAvailableSpellSlot(actor, "spell5")).toBe(false);
    expect(hasAvailableSpellSlot(actor, "pact")).toBe(true);
  });
});

describe("buildActionBarResources", () => {
  beforeEach(() => installFoundry());

  it("lists class resources without pact magic", () => {
    const actor = makeActor({
      system: {
        spells: { pact: { value: 1, max: 1, level: 1 } },
        resources: { primary: { label: "Ki", value: 1, max: 2 } }
      }
    });
    expect(buildActionBarResources(actor).map((r) => r.id)).toEqual(["primary"]);
  });
});
