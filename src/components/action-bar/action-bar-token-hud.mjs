import { getMovementModes } from "../../common/action-economy.mjs";
import { ich } from "../../common/i18n.mjs";

function resolveCanvasToken(token) {
  if (!token) return null;
  return canvas.tokens?.get(token.id) ?? token;
}

function statusEffectVisibleOnHud(effect, actor) {
  if (!effect || effect.hud === false) return false;
  if (!actor) return true;

  const hud = effect.hud;
  if (hud && typeof hud === "object" && hud.actorTypes?.length) {
    const type = actor.type ?? actor.document?.type;
    return hud.actorTypes.includes(type);
  }

  return true;
}

function mapFoundryMovementChoices(choices, currentMode) {
  return Object.values(choices).map((entry) => ({
    id: entry.id,
    label: entry.label,
    speed: null,
    isActive: entry.isActive ?? entry.id === currentMode
  }));
}

function mapFoundryStatusChoices(choices) {
  return Object.values(choices).map((entry) => ({
    id: entry.id,
    title: entry.title ?? entry.name ?? entry.id,
    src: entry.src ?? entry.img ?? "icons/svg/aura.svg",
    isActive: Boolean(entry.isActive),
    isOverlay: Boolean(entry.isOverlay)
  }));
}

/** Movement types from the actor sheet (walk / fly / swim), not Foundry locomotion actions (speed / crawl). */
export function collectMovementChoices(token) {
  if (!token?.actor) return [];

  const current = token.document.movementAction || "walk";
  const dndModes = getMovementModes(token.actor);
  if (dndModes.length) {
    return dndModes.map((entry) => ({
      id: entry.id,
      label: entry.label,
      speed: entry.speed > 0 ? entry.speed : null,
      hint: entry.baseSpeed
        ? ich.movement("reducedFrom", { current: entry.speed, base: entry.baseSpeed })
        : null,
      isActive: current === entry.id
    }));
  }

  const placeable = resolveCanvasToken(token);
  const fromToken = placeable?._getMovementActionChoices?.();
  if (fromToken && Object.keys(fromToken).length) {
    return mapFoundryMovementChoices(fromToken, current);
  }

  return [];
}

async function restoreTokenHud(hud, previous, placeable, wasAlreadyBound) {
  if (wasAlreadyBound) return;
  if (previous && previous.id !== placeable?.id) {
    await hud.bind?.(previous);
    return;
  }
  if (typeof hud.clear === "function") {
    hud.clear();
    return;
  }
  await hud.close?.();
}

async function readHudStatusChoices(placeable) {
  const hud = canvas?.hud?.token;
  if (!hud?.bind || !placeable) return null;

  const previous = hud.object ?? null;
  const wasAlreadyBound = previous?.id === placeable.id;

  try {
    if (!wasAlreadyBound) await hud.bind(placeable);
    const choices = hud._getStatusEffectChoices?.();
    if (choices && Object.keys(choices).length) {
      return mapFoundryStatusChoices(choices);
    }
    return null;
  } finally {
    await restoreTokenHud(hud, previous, placeable, wasAlreadyBound);
  }
}

export async function collectStatusChoices(token) {
  const placeable = resolveCanvasToken(token);
  const fromHud = await readHudStatusChoices(placeable);
  if (fromHud?.length) return fromHud;

  if (!token?.actor) return [];

  return (CONFIG.statusEffects ?? [])
    .filter((effect) => statusEffectVisibleOnHud(effect, token.actor))
    .map((effect) => ({
      id: effect.id,
      title: effect.name ?? effect.label ?? effect.id,
      src: effect.img ?? effect.icon ?? "icons/svg/aura.svg",
      isActive: Boolean(token.document.hasStatusEffect?.(effect.id)),
      isOverlay: Boolean(effect.overlay)
    }));
}

export async function toggleTokenStatusEffect(token, statusId) {
  if (typeof token.toggleEffect === "function") {
    return token.toggleEffect(statusId);
  }
  return token.actor?.toggleStatusEffect?.(statusId);
}
