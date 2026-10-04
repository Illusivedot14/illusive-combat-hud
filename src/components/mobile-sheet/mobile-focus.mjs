/**
 * Shared “who is selected” for the mobile carousel / dice roller.
 * Center-snapped (or last tapped) portrait is the active character.
 */

let focusedActorId = null;

export function setMobileFocusedActorId(actorId) {
  focusedActorId = actorId || null;
}

export function getMobileFocusedActorId() {
  return focusedActorId;
}

export function getMobileFocusedActor() {
  return focusedActorId ? game.actors?.get?.(focusedActorId) ?? null : null;
}
