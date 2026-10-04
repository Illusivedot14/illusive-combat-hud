function combatInCollection(combat) {
  if (!combat) return false;
  const id = combat.id ?? combat._id;
  if (!id || !game?.combats) return true;
  // Prefer has() when available; never use strict get (Foundry throws if the id is gone).
  if (typeof game.combats.has === "function") return game.combats.has(id);
  try {
    return Boolean(game.combats.get(id));
  } catch {
    return false;
  }
}

function readViewedCombatSafe() {
  try {
    return game.combat ?? game.combats?.viewed ?? ui.combat?.viewed ?? null;
  } catch {
    // Foundry can throw "The Combat <id> does not exist in combats" while the
    // viewed id is briefly stale during deleteCombat / endCombat.
    return null;
  }
}

function resolveSceneCombat(scene) {
  if (!scene || !game.combats) return null;

  try {
    const sceneCombats = game.combats.combats ?? [];
    if (sceneCombats.length) return sceneCombats[0];

    const legacy = scene.combat;
    if (legacy) {
      if (typeof legacy === "string") {
        try {
          return game.combats.get(legacy) ?? null;
        } catch {
          return null;
        }
      }
      return legacy;
    }

    for (const combat of game.combats.contents ?? []) {
      const sceneId = combat.scene?.id ?? combat.sceneId ?? combat.scene;
      if (sceneId === scene.id) return combat;
    }
  } catch {
    return null;
  }

  return null;
}

export function getViewedCombat() {
  if (!game?.combats) return null;

  const viewed = readViewedCombatSafe();
  // Drop zombies: game.combat can still resolve a deleted encounter for a beat.
  if (viewed && combatInCollection(viewed)) return viewed;

  if (!canvas?.scene) return null;
  return resolveSceneCombat(canvas.scene);
}

/**
 * The combatant whose turn it currently is.
 *
 * We index `combat.turns[combat.turn]` directly rather than reading
 * `combat.combatant`. In Foundry v14 `combat.combatant` resolves through the
 * internal `_current.combatantId`, which is refreshed a beat *after* the
 * `combatTurnChange` hook fires — reading it during a turn-change refresh
 * reports the previous combatant and the carousel highlight lags "one behind".
 * Our render passes are async (serialized in render/core.mjs), so by paint time
 * the update is committed and `combat.turns[combat.turn]` is authoritative.
 */
export function getActiveCombatant(combat) {
  if (!combat) return null;

  const turn = combat.turn;
  if (turn == null || turn < 0) return combat.combatant ?? null;
  return combat.turns?.[turn] ?? combat.combatant ?? null;
}

export function getSortedCombatants(combat) {
  const sorted = Array.from(combat.combatants ?? []).sort(combat._sortCombatants.bind(combat));
  // Players never see GM-concealed combatants; the GM still sees them (styled as hidden).
  return game.user?.isGM ? sorted : sorted.filter((combatant) => !combatant.hidden);
}

/** All combat encounters on the current scene (falls back to all combats). */
export function getSceneCombats() {
  try {
    const all = game.combats?.contents ?? [];
    const sceneId = canvas?.scene?.id;
    const scoped = sceneId
      ? all.filter((combat) => (combat.scene?.id ?? combat.sceneId ?? combat.scene) === sceneId)
      : [];
    return scoped.length ? scoped : all;
  } catch {
    return [];
  }
}

/** The group id a combatant belongs to, or null. `combatant.group` is a DocumentIdField. */
function getCombatantGroupId(combatant) {
  const group = combatant?.group;
  if (!group) return null;
  return typeof group === "string" ? group : group.id ?? null;
}

/**
 * Turn-order "units": each entry is either a single combatant or a collapsed
 * combatant group. A group is placed at the position of its first member and
 * gathers all members (which share initiative, so they sort adjacently anyway).
 * Each unit exposes a stable `id` and the `memberIds` it represents.
 */
export function getCombatUnits(combat) {
  const sorted = getSortedCombatants(combat);
  const units = [];
  const groupUnits = new Map();

  for (const combatant of sorted) {
    const groupId = getCombatantGroupId(combatant);
    const group = groupId ? combat.groups?.get(groupId) : null;

    if (group) {
      let unit = groupUnits.get(groupId);
      if (!unit) {
        unit = { id: `group:${groupId}`, kind: "group", group, members: [], memberIds: [] };
        groupUnits.set(groupId, unit);
        units.push(unit);
      }
      unit.members.push(combatant);
      unit.memberIds.push(combatant.id);
    } else {
      units.push({
        id: combatant.id,
        kind: "combatant",
        combatant,
        members: [combatant],
        memberIds: [combatant.id]
      });
    }
  }

  return units;
}
