/**
 * Illusive Combat HUD — rendering (single entry point).
 *
 * Usage:
 *   import { refreshHud, bindRenderHooks, ICH_RENDER } from "../common/render.mjs";
 *   bindRenderHooks();
 *   refreshHud(ICH_RENDER.ALL);
 *   refreshHud(ICH_RENDER.SELECTION);
 */

export { ICH_RENDER, resolveRenderMask } from "./render/scopes.mjs";
export { refreshHud, repositionHud } from "./render/core.mjs";
export { bindRenderHooks } from "./render/hooks.mjs";
