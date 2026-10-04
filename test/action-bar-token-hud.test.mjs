// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { installFoundry } from "./helpers.mjs";
import { collectMovementChoices, collectStatusChoices } from "../src/components/action-bar/action-bar-token-hud.mjs";

describe("action-bar-token-hud", () => {
  beforeEach(() => {
    installFoundry();
    globalThis.CONFIG.statusEffects = [
      { id: "prone", name: "Prone", img: "icons/svg/falling.svg", hud: true },
      { id: "hidden", name: "Hidden", img: "icons/svg/invisible.svg", hud: false }
    ];
    globalThis.CONFIG.DND5E = {
      movementTypes: {
        walk: { label: "DND5E.MOVEMENT.Type.Walk" },
        fly: { label: "DND5E.MOVEMENT.Type.Fly" }
      }
    };
    globalThis.canvas = {
      tokens: { get: () => null },
      hud: { token: null }
    };
  });

  it("prefers actor movement modes over Foundry locomotion actions", () => {
    const token = {
      id: "tokA",
      document: { movementAction: "walk" },
      actor: { system: { attributes: { movement: { walk: 30, fly: 60 } } } },
      _getMovementActionChoices: () => ({
        speed: { id: "speed", label: "Speed", isActive: true },
        fly: { id: "fly", label: "Fly", isActive: false }
      })
    };

    const choices = collectMovementChoices(token);
    expect(choices.map((entry) => entry.id)).toEqual(["walk", "fly"]);
    expect(choices[0].speed).toBe(30);
    expect(choices[1].speed).toBe(60);
  });

  it("marks the active movement mode", () => {
    const token = {
      document: { movementAction: "fly" },
      actor: { system: { attributes: { movement: { walk: 30, fly: 60 } } } }
    };

    const choices = collectMovementChoices(token);
    expect(choices.find((entry) => entry.id === "fly").isActive).toBe(true);
  });

  it("collects HUD status choices when available", async () => {
    const token = {
      id: "t1",
      actor: { type: "character" },
      document: { hasStatusEffect: () => false }
    };
    let cleared = 0;
    globalThis.canvas.tokens.get = () => token;
    globalThis.canvas.hud.token = {
      object: null,
      bind: async () => {},
      clear: () => { cleared += 1; },
      _getStatusEffectChoices: () => ({
        prone: { id: "prone", title: "Prone", src: "icons/svg/falling.svg", isActive: false }
      })
    };

    const choices = await collectStatusChoices(token);
    expect(choices).toHaveLength(1);
    expect(cleared).toBe(1);
  });

  it("does not clear the Token HUD when it was already open on the token", async () => {
    const token = {
      id: "t1",
      actor: { type: "character" },
      document: { hasStatusEffect: () => false }
    };
    let cleared = 0;
    let binds = 0;
    globalThis.canvas.tokens.get = () => token;
    globalThis.canvas.hud.token = {
      object: token,
      bind: async () => { binds += 1; },
      clear: () => { cleared += 1; },
      _getStatusEffectChoices: () => ({
        prone: { id: "prone", title: "Prone", src: "icons/svg/falling.svg", isActive: false }
      })
    };

    const choices = await collectStatusChoices(token);
    expect(choices).toHaveLength(1);
    expect(binds).toBe(0);
    expect(cleared).toBe(0);
  });

  it("filters hidden status effects in the fallback list", async () => {
    const token = {
      actor: { type: "character" },
      document: { hasStatusEffect: () => false }
    };

    const choices = await collectStatusChoices(token);
    expect(choices.map((entry) => entry.id)).toEqual(["prone"]);
  });
});
