import { describe, it, expect, beforeEach } from "vitest";
import { installFoundry, makeActor } from "./helpers.mjs";
import {
  getMidiActions,
  isEconomyAvailable,
  getEconomyAvailability
} from "../src/common/midi.mjs";

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

  describe("isEconomyAvailable action", () => {
    it("is true with no actor", () => expect(isEconomyAvailable(null, "action")).toBe(true));
    it("is true when the action flag is unset", () =>
      expect(isEconomyAvailable(makeActor(), "action")).toBe(true));
    it("is false when the action has been spent", () =>
      expect(isEconomyAvailable(actorWithMidi({ action: true }), "action")).toBe(false));
  });

  describe("isEconomyAvailable bonus", () => {
    it("falls back to used/max counts from flags", () => {
      expect(isEconomyAvailable(actorWithMidi({ bonusActionsUsed: 0, bonusActionsMax: 1 }), "bonus")).toBe(true);
      expect(isEconomyAvailable(actorWithMidi({ bonusActionsUsed: 1, bonusActionsMax: 1 }), "bonus")).toBe(false);
    });

    it("prefers the midi API when present", () => {
      installFoundry({ midiApi: { hasUsedBonusAction: () => true } });
      expect(isEconomyAvailable(makeActor(), "bonus")).toBe(false);
      installFoundry({ midiApi: { hasUsedBonusAction: () => false } });
      expect(isEconomyAvailable(makeActor(), "bonus")).toBe(true);
    });
  });

  describe("isEconomyAvailable reaction", () => {
    it("falls back to used/max counts from flags", () => {
      expect(isEconomyAvailable(actorWithMidi({ reactionsUsed: 0, reactionsMax: 1 }), "reaction")).toBe(true);
      expect(isEconomyAvailable(actorWithMidi({ reactionsUsed: 1, reactionsMax: 1 }), "reaction")).toBe(false);
    });

    it("prefers the midi API when present", () => {
      installFoundry({ midiApi: { hasUsedReaction: () => true } });
      expect(isEconomyAvailable(makeActor(), "reaction")).toBe(false);
    });
  });

  it("getEconomyAvailability aggregates the three economies", () => {
    const actor = actorWithMidi({ action: true, bonusActionsUsed: 0, bonusActionsMax: 1 });
    expect(getEconomyAvailability(actor)).toEqual({ action: false, bonus: true, reaction: true });
  });

  it("isEconomyAvailable defaults unknown types to true", () => {
    const actor = actorWithMidi({ action: true });
    expect(isEconomyAvailable(actor, "action")).toBe(false);
    expect(isEconomyAvailable(actor, "bonus")).toBe(true);
    expect(isEconomyAvailable(actor, "legendary")).toBe(true);
  });
});
