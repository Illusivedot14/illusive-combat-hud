import { describe, it, expect, beforeEach } from "vitest";
import { installFoundry, makeActor } from "./helpers.mjs";
import {
  getMidiActions,
  isActionAvailable,
  isBonusActionAvailable,
  isReactionAvailable,
  getEconomyAvailability,
  canSpendEconomy
} from "../src/common/midi-qol.mjs";

function actorWithMidi(actions) {
  return makeActor({ flags: { "midi-qol": { actions } } });
}

describe("midi-qol economy", () => {
  beforeEach(() => installFoundry());

  it("getMidiActions returns the flag payload or an empty object", () => {
    expect(getMidiActions(actorWithMidi({ action: true }))).toEqual({ action: true });
    expect(getMidiActions(makeActor())).toEqual({});
    expect(getMidiActions(null)).toEqual({});
  });

  describe("isActionAvailable", () => {
    it("is true with no actor", () => expect(isActionAvailable(null)).toBe(true));
    it("is true when the action flag is unset", () =>
      expect(isActionAvailable(makeActor())).toBe(true));
    it("is false when the action has been spent", () =>
      expect(isActionAvailable(actorWithMidi({ action: true }))).toBe(false));
  });

  describe("isBonusActionAvailable", () => {
    it("falls back to used/max counts from flags", () => {
      expect(isBonusActionAvailable(actorWithMidi({ bonusActionsUsed: 0, bonusActionsMax: 1 }))).toBe(true);
      expect(isBonusActionAvailable(actorWithMidi({ bonusActionsUsed: 1, bonusActionsMax: 1 }))).toBe(false);
    });

    it("prefers the midi API when present", () => {
      installFoundry({ midiApi: { hasUsedBonusAction: () => true } });
      expect(isBonusActionAvailable(makeActor())).toBe(false);
      installFoundry({ midiApi: { hasUsedBonusAction: () => false } });
      expect(isBonusActionAvailable(makeActor())).toBe(true);
    });
  });

  describe("isReactionAvailable", () => {
    it("falls back to used/max counts from flags", () => {
      expect(isReactionAvailable(actorWithMidi({ reactionsUsed: 0, reactionsMax: 1 }))).toBe(true);
      expect(isReactionAvailable(actorWithMidi({ reactionsUsed: 1, reactionsMax: 1 }))).toBe(false);
    });

    it("prefers the midi API when present", () => {
      installFoundry({ midiApi: { hasUsedReaction: () => true } });
      expect(isReactionAvailable(makeActor())).toBe(false);
    });
  });

  it("getEconomyAvailability aggregates the three economies", () => {
    const actor = actorWithMidi({ action: true, bonusActionsUsed: 0, bonusActionsMax: 1 });
    expect(getEconomyAvailability(actor)).toEqual({ action: false, bonus: true, reaction: true });
  });

  it("canSpendEconomy reads a single economy and defaults unknown types to true", () => {
    const actor = actorWithMidi({ action: true });
    expect(canSpendEconomy(actor, "action")).toBe(false);
    expect(canSpendEconomy(actor, "bonus")).toBe(true);
    expect(canSpendEconomy(actor, "legendary")).toBe(true);
  });
});
