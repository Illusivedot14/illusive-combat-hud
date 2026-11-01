/**
 * Write one changed actor field into the controls that already show it.
 * Returns false when the screen is missing the node, so the caller can rebuild
 * that one panel. A missing panel is not a reason to rebuild it.
 */
import { getDamageWashCssPct, getHpBarData } from "./actor-stats.mjs";

function tokenIdsForActor(actor) {
  const ids = new Set();
  if (!actor?.id) return ids;
  for (const token of actor.getActiveTokens?.(true, true) ?? []) {
    const id = token?.id ?? token?.document?.id;
    if (id) ids.add(id);
  }
  const scenes = [game.scenes?.viewed, game.scenes?.active, game.scenes?.current].filter(Boolean);
  for (const scene of scenes) {
    for (const doc of scene.tokens ?? []) {
      if ((doc.actorId ?? doc.actor?.id) === actor.id) {
        const id = doc.id ?? doc._id;
        if (id) ids.add(id);
      }
    }
  }
  return ids;
}

function actorCards(selector, actor) {
  const root = document.querySelector(selector);
  if (!root || !actor?.id) return [];
  const ids = tokenIdsForActor(actor);
  return [...root.querySelectorAll("[data-actor-id], [data-token-id]")].filter((card) => {
    if (card.dataset.actorId === actor.id) return true;
    return ids.has(card.dataset.tokenId);
  });
}

/** Party portraits. HP wash and name only; a downed token still needs the full card. */
export function syncPartyFields(actor, fields) {
  const cards = actorCards("#ich-party-list", actor);
  if (!cards.length) return true;
  const hp = getHpBarData(actor);
  const downed = (hp.value ?? 0) <= 0 && (hp.max ?? 0) > 0;
  if (downed || fields.has("death")) return false;

  for (const card of cards) {
    if (card.querySelector(".ich-party-vitality-icon")) return false;
    if (fields.has("hp")) {
      card.style.setProperty("--ich-hp-pct", `${getDamageWashCssPct(hp.totalPercent)}%`);
      card.dataset.hpTier = hp.tier;
    }
    if (fields.has("identity")) {
      const img = card.querySelector(".ich-portrait-img");
      if (img && actor.img) img.src = actor.img;
      if (actor.name) card.setAttribute("aria-label", actor.name);
    }
  }
  return true;
}

/** Initiative cards. Same rule as the party: numbers in place, structure falls back. */
export function syncTurnFields(actor, fields) {
  const cards = actorCards("#ich-turn-tracker-track", actor);
  if (!cards.length) return true;
  const hp = getHpBarData(actor);
  const downed = (hp.value ?? 0) <= 0 && (hp.max ?? 0) > 0;
  if (downed || fields.has("death")) return false;

  for (const card of cards) {
    if (card.querySelector(".ich-turn-vitality-icon")) return false;
    if (fields.has("hp")) {
      const label = card.querySelector(".ich-turn-hp");
      if (label) label.textContent = `${hp.value}/${hp.max}`;
      card.style.setProperty("--ich-hp-pct", `${getDamageWashCssPct(hp.totalPercent)}%`);
      card.dataset.hpTier = hp.tier;
    }
    if (fields.has("identity")) {
      const img = card.querySelector(".ich-turn-portrait-img");
      if (img && actor.img) img.src = actor.img;
      const name = card.querySelector(".ich-turn-name");
      if (name && actor.name) name.textContent = actor.name;
    }
  }
  return true;
}

/** The open action bar: HP line and AC chip. Movement has its own sync. */
export function syncActionBarFields(actor, fields) {
  const bar = document.getElementById("ich-action-bar");
  if (!bar || bar.hidden) return true;
  const hp = getHpBarData(actor);
  const downed = (hp.value ?? 0) <= 0 && (hp.max ?? 0) > 0;
  if ((fields.has("hp") || fields.has("death")) && (downed || fields.has("death"))) return false;

  if (fields.has("hp")) {
    const current = bar.querySelector(".ich-mock-hp-current");
    const max = bar.querySelector(".ich-mock-hp-max");
    if (!current || !max) return false;
    current.textContent = String(hp.value ?? 0);
    max.textContent = `/${hp.max ?? 0}`;
    const temp = bar.querySelector(".ich-mock-hp-temp");
    if (hp.temp) {
      if (!temp) return false;
      temp.textContent = `+${hp.temp}`;
    } else if (temp) {
      temp.remove();
    }
  }

  if (fields.has("ac")) {
    const ac = bar.querySelector(".ich-mock-ac");
    if (ac) ac.textContent = String(actor.system?.attributes?.ac?.value ?? "");
  }

  if (fields.has("identity")) {
    const img = bar.querySelector(".ich-mock-portrait");
    if (img && actor.img) img.src = actor.img;
    const name = bar.querySelector(".ich-mock-char-name");
    if (name && actor.name) name.textContent = actor.name;
  }
  return true;
}
