import { getMidiApi } from "./midi-qol.mjs";
import { buildHudMidiOptions } from "./midi-use.mjs";
import { MODULE_ID } from "./constants.mjs";
import { resolveActionBarToken } from "./action-bar-token.mjs";
import { getTargetPickState } from "../components/action-bar/action-bar-target-picker.mjs";

let reactionContext = null;
let reactionPromptTimer = null;

export function getReactionContext() {
  return reactionContext;
}

export function setReactionContext(context) {
  reactionContext = context;
}

export function clearReactionContext() {
  reactionContext = null;
}

export function buildReactionKeys(activities) {
  return new Set(
    (activities ?? []).map((activity) => {
      const itemId = activity.item?.id ?? activity.parent?.id;
      return `${itemId}:${activity.id}`;
    })
  );
}

export function findTokenForActor(actor, { preferControlled = true } = {}) {
  if (!actor || !canvas?.tokens) return null;

  if (preferControlled) {
    const controlled = canvas.tokens.controlled?.find((token) => token.actor?.id === actor.id);
    if (controlled) return controlled;
  }

  return canvas.tokens.placeables.find((token) => token.actor?.id === actor.id) ?? null;
}

export function isReactionActorForUser(actor) {
  return Boolean(actor?.isOwner);
}

export function getActionBarToken() {
  // Keep the casting token on the HUD while the target picker is open.
  const pick = getTargetPickState();
  if (pick?.tokenId) {
    const casting = canvas?.tokens?.get(pick.tokenId);
    if (casting) return casting;
  }
  return resolveActionBarToken(reactionContext);
}

function resolveTriggerTokenUuid(options = {}, existing = null) {
  return options.workflow?.tokenUuid
    ?? options.triggerTokenUuid
    ?? existing?.triggerTokenUuid
    ?? null;
}

export function startReactionPrompt(actor, activities, triggerType, options = {}) {
  if (!actor?.id) return;

  let timeoutMs = 12000;
  try {
    timeoutMs = (game.settings.get("midi-qol", "reactionTimeout") ?? 12) * 1000;
  } catch {
    timeoutMs = 12000;
  }

  setReactionContext({
    actorId: actor.id,
    reactionKeys: buildReactionKeys(activities),
    triggerType,
    triggerTokenUuid: resolveTriggerTokenUuid(options, reactionContext),
    options,
    flavor: triggerType
  });

  if (reactionPromptTimer) clearTimeout(reactionPromptTimer);
  reactionPromptTimer = setTimeout(() => {
    passReaction();
  }, timeoutMs);
}

export function attachReactionDialog(app) {
  if (!app?.data || !reactionContext) return;
  if (app.data.actor?.id !== reactionContext.actorId) return;

  reactionContext.pendingDialog = app;
  reactionContext.dialogCallback = app.data.callback;
  reactionContext.dialogClose = app.data.close;
  app.data.completed = true;
  queueMicrotask(() => app.close({ force: true }));
}

export function passReaction() {
  const ctx = reactionContext;
  if (ctx?.dialogClose) {
    ctx.dialogClose({ name: "Close", uuid: undefined });
  }
  clearReactionPrompt();
}

export function clearReactionPrompt() {
  if (reactionPromptTimer) {
    clearTimeout(reactionPromptTimer);
    reactionPromptTimer = null;
  }
  clearReactionContext();
  Hooks.callAll(`${MODULE_ID}.reactionPromptClosed`);
}

export async function useReactionFromHud(token, itemId, activityId) {
  const context = reactionContext;
  const actor = token?.actor;
  if (!context || context.actorId !== actor?.id) return false;

  const item = actor.items.get(itemId);
  const activity = item?.system?.activities?.get(activityId);
  if (!activity) return false;

  if (context.dialogCallback && context.pendingDialog) {
    await context.dialogCallback(context.pendingDialog, { key: activity.uuid });
    clearReactionPrompt();
    return true;
  }

  const midi = getMidiApi();
  const midiOptions = buildHudMidiOptions(token, activity, "reaction", context);
  if (midi?.completeActivityUse) {
    await midi.completeActivityUse(
      activity,
      { midiOptions },
      {},
      { systemCard: false }
    );
  } else {
    await activity.use({ midiOptions }, {});
  }

  clearReactionPrompt();
  return true;
}
