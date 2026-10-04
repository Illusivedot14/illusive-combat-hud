import { describe, it, expect, beforeEach } from "vitest";
import { installFoundry, makeActor, makeToken, makeCombat, makeCombatant } from "./helpers.mjs";
import {
  getCombatantForToken,
  findCombatantForToken,
  buildEconomyPips,
  buildLegendaryPips,
  getMovementModes,
  buildMovementData
} from "../src/common/action-economy.mjs";

describe("getCombatantForToken", () => {
  it("returns null when there is no started combat", () => {
    installFoundry();
    expect(getCombatantForToken(makeToken())).toBeNull();
  });

  it("finds the combatant matching the token id", () => {
    const cmb = makeCombatant({ id: "c1", tokenId: "tokA" });
    installFoundry({ combat: makeCombat({ started: true, combatants: [cmb] }) });
    expect(getCombatantForToken(makeToken({ id: "tokA" }))).toBe(cmb);
  });
});

describe("findCombatantForToken", () => {
  it("finds a combatant before combat has started", () => {
    const cmb = makeCombatant({ id: "c1", tokenId: "tokA" });
    installFoundry({ combat: makeCombat({ started: false, combatants: [cmb] }) });
    expect(findCombatantForToken(makeToken({ id: "tokA" }))).toBe(cmb);
    expect(getCombatantForToken(makeToken({ id: "tokA" }))).toBeNull();
  });
});

describe("buildEconomyPips", () => {
  it("returns [] when the token is not in the active combat", () => {
    installFoundry();
    expect(buildEconomyPips(makeToken())).toEqual([]);
  });

  it("returns action/bonus/reaction pips with midi availability", () => {
    const actor = makeActor({ flags: { "midi-qol": { actions: { action: true } } } });
    const token = makeToken({ id: "tokA", actor });
    const cmb = makeCombatant({ id: "c1", tokenId: "tokA" });
    installFoundry({ combat: makeCombat({ started: true, combatants: [cmb] }) });

    const pips = buildEconomyPips(token);
    expect(pips.map((p) => p.id)).toEqual(["action", "bonus", "reaction"]);
    expect(pips.find((p) => p.id === "action").available).toBe(false);
    expect(pips.find((p) => p.id === "bonus").available).toBe(true);
  });
});

describe("buildLegendaryPips", () => {
  beforeEach(() => installFoundry());

  it("returns null without legendary actions", () => {
    expect(buildLegendaryPips(makeActor())).toBeNull();
  });

  it("reports remaining/max, computing remaining from spent when needed", () => {
    const actor = makeActor({ system: { resources: { legact: { max: 3, spent: 1 } } } });
    const pips = buildLegendaryPips(actor);
    expect(pips).toMatchObject({ remaining: 2, max: 3 });
  });

  it("prefers an explicit value when present", () => {
    const actor = makeActor({ system: { resources: { legact: { max: 3, value: 1 } } } });
    expect(buildLegendaryPips(actor).remaining).toBe(1);
  });
});

describe("getMovementModes", () => {
  beforeEach(() => {
    installFoundry();
    globalThis.CONFIG.DND5E.movementTypes = {
      walk: { label: "DND5E.Walk" },
      fly: { label: "DND5E.Fly" },
      burrow: { label: "DND5E.Burrow", hidden: true }
    };
  });

  it("returns [] for an actor with no movement", () => {
    expect(getMovementModes(makeActor({ movement: null }))).toEqual([]);
  });

  it("includes walk always and any positive-speed non-hidden modes", () => {
    const actor = makeActor({ movement: { walk: 0, fly: 60, burrow: 10 } });
    const modes = getMovementModes(actor);
    expect(modes.map((m) => m.id)).toEqual(["walk", "fly"]);
    expect(modes.find((m) => m.id === "fly").speed).toBe(60);
    expect(modes.find((m) => m.id === "walk").label).toBe("Walk");
  });

  it("labels walk as Walk even when dnd5e config says Speed", () => {
    globalThis.CONFIG.DND5E.movementTypes = {
      walk: { label: "DND5E.MOVEMENT.Type.Speed" },
      fly: { label: "DND5E.MOVEMENT.Type.Fly" }
    };
    globalThis.game.i18n.localize = (key) => (
      key === "DND5E.MOVEMENT.Type.Walk" ? "Walk" : key
    );
    const actor = makeActor({ movement: { walk: 20, fly: 80 } });
    const modes = getMovementModes(actor);
    expect(modes[0]).toMatchObject({ id: "walk", label: "Walk", speed: 20 });
  });

  it("records base walk speed when effective speed is reduced", () => {
    const actor = makeActor({ movement: { walk: 20, fly: 80 } });
    actor._source = { system: { attributes: { movement: { walk: 30 } } } };
    const walk = getMovementModes(actor).find((m) => m.id === "walk");
    expect(walk).toMatchObject({ speed: 20, baseSpeed: 30 });
  });
});

describe("buildMovementData", () => {
  it("returns null when out of combat", () => {
    installFoundry();
    expect(buildMovementData(makeToken({ actor: makeActor() }))).toBeNull();
  });

  it("computes remaining movement with no history used", () => {
    installFoundry({ combat: makeCombat({ started: true }) });
    const token = makeToken({ actor: makeActor({ movement: { walk: 30 } }) });
    const data = buildMovementData(token);
    expect(data).toMatchObject({ usedFeet: 0, maxFeet: 30, remainingFeet: 30, percent: 100, isDashing: false });
  });

  it("doubles max movement when the actor is dashing", () => {
    installFoundry({ combat: makeCombat({ started: true }) });
    const actor = makeActor({ movement: { walk: 30 }, flags: { "illusive-combat-hud": { dashing: true } } });
    const data = buildMovementData(makeToken({ actor }));
    expect(data.isDashing).toBe(true);
    expect(data.maxFeet).toBe(60);
  });

  it("measures used feet from the movement path when available", () => {
    installFoundry({ combat: makeCombat({ started: true }) });
    const token = makeToken({
      actor: makeActor({ movement: { walk: 30, max: 70, fly: 70 } }),
      movementHistory: [{ x: 0 }, { x: 1 }],
      measureMovementPath: () => ({ cost: 10 })
    });
    const data = buildMovementData(token);
    expect(data.usedFeet).toBe(10);
    expect(data.remainingFeet).toBe(60);
    expect(data.maxFeet).toBe(70);
  });

  it("uses the gestalt movement pool max when present", () => {
    installFoundry({ combat: makeCombat({ started: true }) });
    const token = makeToken({ actor: makeActor({ movement: { walk: 40, fly: 70, max: 70 } }) });
    const data = buildMovementData(token);
    expect(data).toMatchObject({ maxFeet: 70, remainingFeet: 70, isGestalt: true });
  });

  it("applies multi-mode remaining: walk 30 then fly shares the leftover pool", () => {
    installFoundry({ combat: makeCombat({ started: true }) });
    globalThis.CONFIG.DND5E.movementTypes = {
      walk: { label: "DND5E.Walk" },
      fly: { label: "DND5E.Fly" }
    };
    const token = makeToken({
      actor: makeActor({ movement: { walk: 30, fly: 90, max: 90 } }),
      movementAction: "fly",
      movementHistory: [
        { x: 0, y: 0, action: "walk" },
        { x: 1, y: 0, action: "walk", cost: 30 },
        { x: 2, y: 0, action: "fly", cost: 40 }
      ],
      measureMovementPath: () => ({ cost: 70 })
    });
    const data = buildMovementData(token);
    expect(data).toMatchObject({ usedFeet: 70, maxFeet: 90, remainingFeet: 20 });
    const walk = data.modes.find((m) => m.id === "walk");
    const fly = data.modes.find((m) => m.id === "fly");
    expect(walk).toMatchObject({ remaining: 0, max: 30, isEmpty: true });
    expect(fly).toMatchObject({ remaining: 20, max: 90, isActive: true });
  });

  it("caps each mode by its own speed against the shared pool", () => {
    installFoundry({ combat: makeCombat({ started: true }) });
    globalThis.CONFIG.DND5E.movementTypes = {
      walk: { label: "DND5E.Walk" },
      fly: { label: "DND5E.Fly" }
    };
    const token = makeToken({
      actor: makeActor({ movement: { walk: 30, fly: 90 } }),
      movementAction: "walk",
      movementHistory: [
        { x: 0, action: "fly" },
        { x: 1, action: "fly", cost: 40 },
        { x: 2, action: "walk", cost: 30 }
      ],
      measureMovementPath: () => ({ cost: 70 })
    });
    const data = buildMovementData(token);
    expect(data.modes.find((m) => m.id === "fly")).toMatchObject({ remaining: 20, used: 40 });
    expect(data.modes.find((m) => m.id === "walk")).toMatchObject({ remaining: 0, used: 30 });
  });
});
