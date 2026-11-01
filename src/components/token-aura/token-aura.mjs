import { MODULE_ID } from "../../common/constants.mjs";
import { ich } from "../../common/i18n.mjs";

const FLAG_KEY = "auras";
const LEGACY_FLAG_KEY = "aura";
const GFX_NAME = "ichAura";
const FILL_ALPHA = 0.18;
const STROKE_ALPHA = 0.9;
const STROKE_WIDTH = 3;

export const MAX_AURAS = 3;
export const MAX_AURA_FEET = 500;
export const DEFAULT_AURA_COLOR = "#e07020";
export const AURA_FEET_CHOICES = Object.freeze([5, 10, 15, 20, 30]);
export const AURA_COLORS = Object.freeze([
  "#e05050",
  "#e07020",
  "#f0a030",
  "#e0c040",
  "#90d050",
  "#40b060",
  "#20c0a0",
  "#4090e0",
  "#4060e0",
  "#8040c0",
  "#c040c0",
  "#e060a0",
  "#f0e8d8",
  "#c0a070",
  "#8b5a2b",
  "#404040"
]);

export function clampAuraFeet(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(MAX_AURA_FEET, Math.round(n)));
}

function canUpdateTokenDocument(doc, token) {
  if (!doc || !game.user) return false;
  if (game.user.isGM) return true;
  if (typeof doc.canUserModify === "function") return doc.canUserModify(game.user, "update");
  return Boolean(doc.isOwner ?? token?.isOwner);
}

function normalizeHex(value, fallback = DEFAULT_AURA_COLOR) {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^#?([0-9a-f]{6})$/i);
  if (!match) return fallback;
  return `#${match[1].toLowerCase()}`;
}

function colorNumber(hex) {
  const Color = globalThis.Color ?? globalThis.foundry?.utils?.Color;
  if (typeof Color?.from === "function") {
    try {
      return Number(Color.from(hex));
    } catch {
      // fall through to parseInt
    }
  }
  const n = parseInt(String(hex).replace("#", ""), 16);
  return Number.isFinite(n) ? n : parseInt(DEFAULT_AURA_COLOR.slice(1), 16);
}

function normalizeAura(raw, index) {
  const feet = clampAuraFeet(raw?.feet);
  const color = normalizeHex(raw?.color);
  return { index, feet, color, on: feet > 0 };
}

function moduleFlags(raw) {
  return raw?.flags?.[MODULE_ID];
}

function listFromAuras(auras) {
  return (auras ?? [])
    .map((raw, index) => normalizeAura(raw, index))
    .filter((aura) => aura.on)
    .slice(0, MAX_AURAS)
    .map((aura, index) => ({ ...aura, index }));
}

function readFlag(doc, key) {
  const raw = doc?.document ?? doc;
  if (!raw) return undefined;
  const owned = moduleFlags(raw);
  if (owned && Object.prototype.hasOwnProperty.call(owned, key)) return owned[key];
  if (typeof raw.getFlag === "function") {
    const fromGet = raw.getFlag(MODULE_ID, key);
    if (fromGet !== undefined) return fromGet;
  }
  return raw._source?.flags?.[MODULE_ID]?.[key];
}

/** Foundry flag updates often store arrays as {0: item, 1: item}. */
function asAuraList(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return null;
  const keys = Object.keys(value)
    .filter((key) => /^\d+$/.test(key))
    .sort((a, b) => Number(a) - Number(b));
  if (keys.length) return keys.map((key) => value[key]);
  if ("feet" in value || "color" in value) return [value];
  return [];
}

export function auraRadiusPixels(feet, grid = globalThis.canvas?.grid) {
  const distance = Number(grid?.distance) || 5;
  const size = Number(grid?.size) || 100;
  if (!(feet > 0) || !(distance > 0) || !(size > 0)) return 0;
  return (feet / distance) * size;
}

export function readTokenAuras(doc) {
  const flagged = asAuraList(readFlag(doc, FLAG_KEY));
  if (flagged) return listFromAuras(flagged);

  const legacy = asAuraList(readFlag(doc, LEGACY_FLAG_KEY));
  if (legacy?.length) {
    const one = normalizeAura(legacy[0], 0);
    return one.on ? [one] : [];
  }

  return [];
}

export function isTokenAuraOn(token) {
  return readTokenAuras(token?.document ?? token).length > 0;
}

export function unusedAuraColor(auras = []) {
  const used = new Set(auras.map((aura) => aura.color));
  return AURA_COLORS.find((color) => !used.has(color)) ?? DEFAULT_AURA_COLOR;
}

export async function writeTokenAuras(token, auras) {
  const doc = token?.document ?? token;
  const next = (auras ?? [])
    .filter((aura) => (Number(aura?.feet) || 0) > 0)
    .slice(0, MAX_AURAS)
    .map((aura) => ({
      feet: clampAuraFeet(aura.feet),
      color: normalizeHex(aura.color)
    }));

  if (!canUpdateTokenDocument(doc, token)) {
    ui.notifications.warn(ich.warning("noOwner"));
    return readTokenAuras(doc);
  }

  try {
    if (typeof doc.update === "function") {
      await doc.update({
        [`flags.${MODULE_ID}.${FLAG_KEY}`]: next,
        [`flags.${MODULE_ID}.-=${LEGACY_FLAG_KEY}`]: null
      });
    } else if (typeof doc.setFlag === "function") {
      await doc.setFlag(MODULE_ID, FLAG_KEY, next);
      if (typeof doc.unsetFlag === "function" && readFlag(doc, LEGACY_FLAG_KEY) != null) {
        await doc.unsetFlag(MODULE_ID, LEGACY_FLAG_KEY);
      }
    } else if (typeof doc.unsetFlag === "function") {
      if (!next.length && readFlag(doc, FLAG_KEY) != null) await doc.unsetFlag(MODULE_ID, FLAG_KEY);
      if (readFlag(doc, LEGACY_FLAG_KEY) != null) await doc.unsetFlag(MODULE_ID, LEGACY_FLAG_KEY);
    }
  } catch {
    // The document did not take the write. The flag is unchanged.
  }

  paintTokenAura(doc?.object ?? token);
  return readTokenAuras(doc);
}

function findAuraGraphics(token) {
  return token.children?.find?.((child) => child?.name === GFX_NAME) ?? null;
}

function ensureAuraGraphics(token) {
  let gfx = findAuraGraphics(token);
  if (gfx) return gfx;

  const Graphics = globalThis.PIXI?.Graphics;
  if (typeof Graphics !== "function") return null;

  gfx = new Graphics();
  gfx.name = GFX_NAME;
  gfx.eventMode = "none";
  gfx.interactive = false;
  gfx.interactiveChildren = false;
  token.addChildAt(gfx, 0);
  return gfx;
}

function drawAuraCircle(gfx, x, y, radius, color) {
  if (!(radius > 0)) return;

  if (typeof gfx.circle === "function" && typeof gfx.fill === "function") {
    gfx.circle(x, y, radius).fill({ color, alpha: FILL_ALPHA });
    gfx.circle(x, y, radius).stroke({ width: STROKE_WIDTH, color, alpha: STROKE_ALPHA });
    return;
  }

  if (typeof gfx.lineStyle === "function" && typeof gfx.beginFill === "function") {
    gfx.lineStyle(STROKE_WIDTH, color, STROKE_ALPHA);
    gfx.beginFill(color, FILL_ALPHA);
    gfx.drawCircle(x, y, radius);
    gfx.endFill();
  }
}

export function paintTokenAura(token) {
  if (!token || token.destroyed) return;
  if (!globalThis.PIXI?.Graphics) return;

  const auras = readTokenAuras(token.document);
  const visible = token.visible !== false && auras.length > 0;
  let gfx = findAuraGraphics(token);

  if (!visible) {
    if (gfx) {
      gfx.visible = false;
      gfx.clear();
    }
    return;
  }

  gfx = ensureAuraGraphics(token);
  if (!gfx) return;

  const width = Number(token.w) || Number(token.document?.width) * Number(canvas?.grid?.size) || 0;
  const height = Number(token.h) || Number(token.document?.height) * Number(canvas?.grid?.size) || 0;
  const x = width / 2;
  const y = height / 2;

  gfx.clear();
  const rings = [...auras].sort((a, b) => b.feet - a.feet);
  for (const aura of rings) {
    drawAuraCircle(gfx, x, y, auraRadiusPixels(aura.feet), colorNumber(aura.color));
  }
  gfx.visible = true;

  const index = token.getChildIndex?.(gfx);
  if (Number.isFinite(index) && index > 0) token.addChildAt(gfx, 0);
}

export function paintAllTokenAuras() {
  const tokens = canvas?.tokens?.placeables ?? canvas?.tokens ?? [];
  for (const token of tokens) paintTokenAura(token);
}

export function bindTokenAuras() {
  Hooks.on("canvasReady", paintAllTokenAuras);
  Hooks.on("refreshToken", (token) => paintTokenAura(token));
  Hooks.on("updateToken", (doc) => paintTokenAura(doc?.object));
}
