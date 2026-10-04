import { ich } from "./i18n.mjs";

/** Drop concentration via dnd5e API when available. */
export async function endActorConcentration(actor) {
  if (!actor) return false;

  if (typeof actor.endConcentration === "function") {
    await actor.endConcentration();
    return true;
  }

  const effect = actor.concentration?.effects?.[0]
    ?? actor.effects?.find?.((entry) => entry.statuses?.has?.("concentrating"));
  if (effect) {
    await effect.delete();
    return true;
  }

  return false;
}

export function hasConcentration(actor) {
  return Boolean(
    actor?.concentration?.effects?.length
    || actor?.effects?.some?.((entry) => entry.statuses?.has?.("concentrating"))
  );
}

export async function dropConcentrationFromHud(token) {
  const actor = token?.actor;
  if (!actor?.isOwner) {
    ui.notifications.warn(ich.warning("noOwner"));
    return false;
  }

  if (!hasConcentration(actor)) return false;

  await endActorConcentration(actor);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor, token: token.document }),
    content: `<strong>${ich.ui("dropConcentration")}</strong> — ${actor.name} stops concentrating.`
  });
  return true;
}
