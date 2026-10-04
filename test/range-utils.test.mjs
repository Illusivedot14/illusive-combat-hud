import { describe, it, expect, beforeEach } from "vitest";
import { installFoundry, makeToken } from "./helpers.mjs";
import { checkAbilityRange, buildTargetListLabel } from "../src/common/range-utils.mjs";
import { initI18n } from "../src/common/i18n/core.mjs";

const ACTIVITY = { id: "act1" };
const ITEM = { system: { activities: { contents: [ACTIVITY] } } };

describe("checkAbilityRange", () => {
  it("is in range when there is no token or no targets", () => {
    installFoundry({ targets: [] });
    expect(checkAbilityRange(null, ITEM, ACTIVITY)).toEqual({ inRange: true });
    expect(checkAbilityRange(makeToken(), ITEM, ACTIVITY)).toEqual({ inRange: true });
  });

  it("is in range when midi or the activity is unavailable", () => {
    installFoundry({ targets: [makeToken()] });
    expect(checkAbilityRange(makeToken(), ITEM, ACTIVITY)).toEqual({ inRange: true });
  });

  it("reports out of range when midi says the result is a failure", () => {
    installFoundry({
      targets: [makeToken()],
      midiApi: { checkActivityRange: () => ({ result: "fail", reason: "tooFar" }) }
    });
    const result = checkAbilityRange(makeToken(), ITEM, ACTIVITY);
    expect(result.inRange).toBe(false);
    expect(result.reason).toBe("tooFar");
  });

  it("reports in range for normal/long results", () => {
    installFoundry({
      targets: [makeToken()],
      midiApi: { checkActivityRange: () => ({ result: "long", reason: null }) }
    });
    expect(checkAbilityRange(makeToken(), ITEM, ACTIVITY).inRange).toBe(true);
  });

  it("fails with noLOS when a target cannot be sensed", () => {
    const target = makeToken();
    installFoundry({
      targets: [target],
      midiApi: {
        checkActivityRange: () => ({ result: "normal", reason: null }),
        canSense: () => false
      }
    });
    const result = checkAbilityRange(makeToken(), ITEM, ACTIVITY);
    expect(result).toEqual({ inRange: false, reason: "noLOS", result: "fail" });
  });
});

describe("buildTargetListLabel", () => {
  beforeEach(async () => {
    installFoundry();
    await initI18n();
  });

  it("is empty with no targets", () => {
    expect(buildTargetListLabel()).toBe("");
  });

  it("lists target names", () => {
    installFoundry({ targets: [{ name: "Goblin" }, { name: "Orc" }] });
    expect(buildTargetListLabel()).toBe("Targets: Goblin, Orc");
  });
});
