import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { installFoundry, makeActor, makeToken, resetFoundry } from "./helpers.mjs";
import {
  buildReactionKeys,
  clearReactionPrompt,
  getActionBarToken,
  getReactionContext,
  passReaction,
  startReactionPrompt,
  useReactionFromHud
} from "../src/common/reaction-context.mjs";

describe("reaction-context", () => {
  beforeEach(() => installFoundry());
  afterEach(() => resetFoundry());

  it("builds stable reaction keys from activities", () => {
    const keys = buildReactionKeys([
      { id: "a1", item: { id: "i1" } },
      { id: "a2", parent: { id: "i2" } }
    ]);
    expect(keys).toEqual(new Set(["i1:a1", "i2:a2"]));
  });

  it("uses the reacting actor token for the action bar during a prompt", () => {
    const wizard = makeActor({ id: "wizard", isOwner: true });
    const fighter = makeActor({ id: "fighter", isOwner: true });
    const wizardToken = makeToken({ id: "tw", actor: wizard });
    const fighterToken = makeToken({ id: "fw", actor: fighter, controlled: true });

    globalThis.canvas = {
      tokens: {
        controlled: [fighterToken],
        placeables: [wizardToken, fighterToken]
      }
    };

    startReactionPrompt(wizard, [{ id: "a1", item: { id: "i1" } }], "reactionpreattack", {
      workflow: { tokenUuid: "Scene.1.Token.attacker" }
    });

    expect(getActionBarToken()).toBe(wizardToken);
    expect(getReactionContext()?.triggerTokenUuid).toBe("Scene.1.Token.attacker");
  });

  it("passes a pending reaction back to Midi when the dialog was intercepted", async () => {
    const activity = { id: "a1", uuid: "Activity.1" };
    const actor = makeActor({
      id: "wizard",
      isOwner: true,
      items: [{
        id: "i1",
        system: { activities: { get: () => activity } }
      }]
    });
    const token = makeToken({ id: "tw", actor });

    const dialogCallback = vi.fn(async () => {});
    startReactionPrompt(actor, [{ id: "a1", item: { id: "i1" } }], "reaction", {});
    getReactionContext().pendingDialog = {};
    getReactionContext().dialogCallback = dialogCallback;
    getReactionContext().dialogClose = vi.fn();

    await useReactionFromHud(token, "i1", "a1");

    expect(dialogCallback).toHaveBeenCalledWith({}, { key: "Activity.1" });
    expect(getReactionContext()).toBeNull();
  });

  it("passes reactions through dialogClose when the player declines", () => {
    const actor = makeActor({ id: "wizard", isOwner: true });
    startReactionPrompt(actor, [{ id: "a1", item: { id: "i1" } }], "reaction", {});
    const dialogClose = vi.fn();
    getReactionContext().dialogClose = dialogClose;

    passReaction();

    expect(dialogClose).toHaveBeenCalledTimes(1);
    expect(getReactionContext()).toBeNull();
  });

  it("clears reaction state on clearReactionPrompt", () => {
    const actor = makeActor({ id: "wizard", isOwner: true });
    startReactionPrompt(actor, [{ id: "a1", item: { id: "i1" } }], "reaction", {});
    clearReactionPrompt();
    expect(getReactionContext()).toBeNull();
  });
});
