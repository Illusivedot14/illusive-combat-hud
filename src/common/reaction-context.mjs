import { getReactionTimeoutMs, resolveTriggerTokenUuid, useActivityFromHud } from "./midi.mjs";
import { MODULE_ID } from "./constants.mjs";
import { resolveActionBarToken } from "./action-bar-token.mjs";
import { getTargetPickState } from "../components/action-bar/action-bar-target-picker.mjs";
import { findActorTokenDoc, findTokenViewById, tokenViewFromDoc } from "./token-step.mjs";

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
  if (!actor) return null;

  if (preferControlled) {
    const controlled = canvas?.tokens?.controlled?.find((token) => token.actor?.id === actor.id);
    if (controlled) return controlled;
  }

  const placeable = canvas?.tokens?.placeables?.find((token) => token.actor?.id === actor.id);
  if (placeable) return placeable;
  return tokenViewFromDoc(findActorTokenDoc(actor));
}

export function isReactionActorForUser(actor) {
  return Boolean(actor?.isOwner);
}

export function getActionBarToken() {
  // Keep the casting token on the HUD while the target picker is open.
  const pick = getTargetPickState();
  if (pick?.tokenId) {
    const casting = findTokenViewById(pick.tokenId);
    if (casting) return casting;
  }
  return resolveActionBarToken(reactionContext);
}

export function startReactionPrompt(actor, activities, triggerType, options = {}) {
  if (!actor?.id) return;

  const timeoutMs = getReactionTimeoutMs();

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

  const used = await useActivityFromHud(token, item, activity, "reaction", {}, context);
  if (used) clearReactionPrompt();
  return used;
}
