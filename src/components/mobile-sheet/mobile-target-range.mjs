/** Scene-document range math. Works with no canvas. */

export function sceneTokens(scene) {
  const tokens = scene?.tokens;
  if (!tokens) return [];
  if (Array.isArray(tokens)) return tokens;
  if (Array.isArray(tokens.contents)) return tokens.contents;
  try {
    return [...tokens];
  } catch {
    return [];
  }
}

export function tokenId(doc) {
  return doc?.id ?? doc?._id ?? null;
}

export function tokenUuid(doc, scene) {
  if (doc?.uuid) return doc.uuid;
  const id = tokenId(doc);
  return scene?.id && id ? `Scene.${scene.id}.Token.${id}` : null;
}

function gridSize(scene) {
  return Number(scene?.grid?.sizeX ?? scene?.grid?.size) || 100;
}

function gridDistance(scene) {
  return Number(scene?.grid?.distance) || 5;
}

function tokenCenter(doc, scene) {
  const size = gridSize(scene);
  const w = (Number(doc?.width) || 1) * size;
  const h = (Number(doc?.height) || 1) * size;
  const x = Number(doc?._source?.x ?? doc?.x) || 0;
  const y = Number(doc?._source?.y ?? doc?.y) || 0;
  return { x: x + w / 2, y: y + h / 2 };
}

/** Center-to-center feet on the scene grid. */
export function tokenDistanceFeet(fromDoc, toDoc, scene) {
  if (!fromDoc || !toDoc || !scene) return Infinity;
  const a = tokenCenter(fromDoc, scene);
  const b = tokenCenter(toDoc, scene);
  return (Math.hypot(a.x - b.x, a.y - b.y) / gridSize(scene)) * gridDistance(scene);
}

/** How far this use can reach, in feet. Unknown range → Infinity (show everyone). */
export function abilityRangeFeet(item, activity) {
  const range = activity?.range ?? item?.system?.range;
  if (!range) return Infinity;
  const units = String(range.units ?? "").toLowerCase();
  if (units === "self") return 0;
  if (units === "touch") return 5;
  if (units === "any" || units === "spec" || units === "special") return Infinity;
  if (units === "mi" || units === "mile" || units === "miles") {
    return (Number(range.value) || 0) * 5280;
  }
  const value = Number(range.value);
  if (Number.isFinite(value) && value > 0) return value;
  return Infinity;
}

export function listTargetsInRange(casterDoc, item, activity, scene) {
  if (!casterDoc || !scene) return [];
  const casterId = tokenId(casterDoc);
  const reach = abilityRangeFeet(item, activity);
  const gm = Boolean(game.user?.isGM);
  const rows = [];

  for (const doc of sceneTokens(scene)) {
    const id = tokenId(doc);
    if (!id || id === casterId) continue;
    if (!gm && doc.hidden) continue;
    const actor = doc.actor ?? game.actors?.get?.(doc.actorId);
    const name = doc.name || actor?.name;
    if (!name) continue;
    const feet = tokenDistanceFeet(casterDoc, doc, scene);
    if (feet > reach + 0.05) continue;
    rows.push({
      id,
      uuid: tokenUuid(doc, scene),
      name,
      img: doc.texture?.src || actor?.img || "icons/svg/mystery-man.svg",
      feet: Math.round(feet)
    });
  }

  rows.sort((a, b) => a.feet - b.feet || a.name.localeCompare(b.name));
  return rows;
}
