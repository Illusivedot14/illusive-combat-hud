/** @typedef {{ party?: boolean, actionBar?: boolean, turn?: boolean, layout?: boolean }} IchRenderMask */

export const ICH_RENDER = Object.freeze({
  ALL: "all",
  LAYOUT: "layout",
  PARTY: "party",
  TOKEN: "token",
  ACTION_BAR: "actionBar",
  TURN: "turn",
  SELECTION: "selection",
  HOTBAR: "hotbar",
  COMBAT_TURN: "combatTurn",
  EFFECTS: "effects",
  THEME: "theme"
});

/** @type {Record<string, IchRenderMask>} */
const PRESETS = {
  [ICH_RENDER.ALL]: { party: true, actionBar: true, turn: true },
  [ICH_RENDER.LAYOUT]: { layout: true },
  [ICH_RENDER.PARTY]: { party: true },
  [ICH_RENDER.TOKEN]: { actionBar: true },
  [ICH_RENDER.ACTION_BAR]: { actionBar: true },
  [ICH_RENDER.TURN]: { turn: true },
  [ICH_RENDER.SELECTION]: { party: true, actionBar: true },
  [ICH_RENDER.HOTBAR]: { layout: true, actionBar: true },
  [ICH_RENDER.COMBAT_TURN]: { party: true, actionBar: true, turn: true },
  [ICH_RENDER.EFFECTS]: { party: true, actionBar: true },
  [ICH_RENDER.THEME]: { party: true, actionBar: true, turn: true, layout: true }
};

/**
 * @param {string | IchRenderMask} scope
 * @returns {IchRenderMask}
 */
export function resolveRenderMask(scope) {
  if (scope && typeof scope === "object") return scope;
  return PRESETS[scope] ?? PRESETS[ICH_RENDER.ALL];
}
