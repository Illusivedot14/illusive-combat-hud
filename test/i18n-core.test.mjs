import { describe, it, expect, beforeEach } from "vitest";
import { installFoundry } from "./helpers.mjs";
import {
  fullKey,
  shortKey,
  looksLikeModuleKey,
  storeString,
  ichLocalize,
  ichResolve,
  ichCore,
  initI18n
} from "../src/common/i18n/core.mjs";

const PREFIX = "illusive-combat-hud.";

describe("i18n/core key helpers", () => {
  beforeEach(() => installFoundry());

  it("fullKey adds the module prefix once", () => {
    expect(fullKey("turn.end")).toBe(`${PREFIX}turn.end`);
    expect(fullKey(`${PREFIX}turn.end`)).toBe(`${PREFIX}turn.end`);
  });

  it("shortKey strips the module prefix", () => {
    expect(shortKey(`${PREFIX}turn.end`)).toBe("turn.end");
    expect(shortKey("turn.end")).toBe("turn.end");
  });

  it("looksLikeModuleKey detects raw module keys and empties", () => {
    expect(looksLikeModuleKey(`${PREFIX}turn.end`)).toBe(true);
    expect(looksLikeModuleKey("End Turn")).toBe(false);
    expect(looksLikeModuleKey("")).toBe(true);
    expect(looksLikeModuleKey(null)).toBe(true);
  });
});

describe("ichLocalize", () => {
  beforeEach(() => installFoundry());

  it("humanizes an unknown key as a readable fallback", () => {
    expect(ichLocalize("reasons.cannotUse")).toBe("Cannot Use");
  });

  it("uses the last meaningful segment, dropping name/hint suffixes", () => {
    expect(ichLocalize("settings.showEnemyHp.name")).toBe("Show Enemy Hp");
  });

  it("substitutes {data} tokens into the resolved string", () => {
    storeString(`${PREFIX}warnings.economySpent`, "{type} already spent.");
    expect(ichLocalize("warnings.economySpent", { type: "action" })).toBe("action already spent.");
  });

  it("returns a stored string verbatim when present", () => {
    storeString(`${PREFIX}turn.end`, "End Turn");
    expect(ichLocalize("turn.end")).toBe("End Turn");
  });

  it("returns empty string for a falsy key", () => {
    expect(ichLocalize("")).toBe("");
  });
});

describe("ichResolve", () => {
  beforeEach(() => installFoundry());

  it("passes non-key strings through and applies data substitution", () => {
    expect(ichResolve("Hello {name}", { name: "Bob" })).toBe("Hello Bob");
  });

  it("localizes strings that look like module keys", () => {
    storeString(`${PREFIX}turn.end`, "End Turn");
    expect(ichResolve("illusive-combat-hud.turn.end")).toBe("End Turn");
  });

  it("returns empty string for nullish input", () => {
    expect(ichResolve(null)).toBe("");
    expect(ichResolve(undefined)).toBe("");
  });
});

describe("ichCore", () => {
  it("formats/localizes a core key via game.i18n", () => {
    installFoundry({
      i18n: {
        lang: "en",
        localize: (k) => (k === "DND5E.Walk" ? "Walk" : k),
        format: (k, d) => `${k}:${d.n}`
      }
    });
    expect(ichCore("DND5E.Walk")).toBe("Walk");
    expect(ichCore("KEY", { n: 3 })).toBe("KEY:3");
  });

  it("returns the key itself when game.i18n is unavailable", () => {
    installFoundry({ i18n: null });
    expect(ichCore("DND5E.Walk")).toBe("DND5E.Walk");
  });
});

describe("initI18n", () => {
  it("loads built-in HUD fallbacks into the string table", async () => {
    installFoundry();
    await initI18n();
    expect(ichLocalize("turn.end")).toBe("End Turn");
    expect(ichLocalize("sections.reaction")).toBe("Reaction");
  });
});
