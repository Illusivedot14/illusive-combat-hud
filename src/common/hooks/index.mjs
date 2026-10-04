/**
 * Foundry hook registration map
 *
 * hooks/index.mjs          bindCanvasHooks() — call once from init
 * hooks/scene-selection    No mass token select on world join / scene load
 * hooks/touch-table        Touch map display (optional)
 *
 * render/hooks.mjs         HUD repaint (party, action bar, combat) — bindRenderHooks()
 * main.mjs                 init / setup / ready lifecycle only
 *
 * Feature hooks live next to their UI:
 *   action-bar.mjs, mobile-sheet.mjs, boss-bar, connection-qr, combat-turn.mjs, …
 */

import { bindSceneLoadDeselect } from "./scene-selection.mjs";
import { bindTouchTableClient } from "./touch-table.mjs";

export { bindSceneLoadDeselect } from "./scene-selection.mjs";
export {
  bindTouchTableClient,
  focusHudToken,
  getHudFocusToken,
  isTouchTableClient,
  releaseCanvasSelection
} from "./touch-table.mjs";

/** Canvas + token behavior (register during init, before canvasReady). */
export function bindCanvasHooks() {
  bindSceneLoadDeselect();
  bindTouchTableClient();
}
