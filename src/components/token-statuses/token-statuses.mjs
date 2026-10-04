import { MODULE_PATH, ichRenderTemplate } from "../../common/constants.mjs";
import { buildTokenStatusData } from "../../common/effect-data.mjs";
import { getActionBarToken } from "../../common/reaction-context.mjs";
import { settingOn } from "../../common/hud-settings.mjs";
import { desktopHudEnabled } from "../../common/mobile-client.mjs";
import { ensureHudOverlay } from "../../common/hud-mount.mjs";
import { publishTurnTrackerBounds } from "../turn-tracker/turn-tracker-position.mjs";
import { bindStatusContextMenu } from "./status-context.mjs";
import { bindStatusTooltips, unpinStatusTooltip } from "./status-tooltip.mjs";

function applyStatusPanelStyles(panel) {
  panel.dataset.expiringStyle = "pulse";
  panel.classList.add("ich-status-disposition-on");
  panel.style.setProperty("--ich-status-buff-border", "#5cb85c");
  panel.style.setProperty("--ich-status-debuff-border", "#d9534f");
}

export function ensureTokenStatusContainer() {
  const overlay = ensureHudOverlay();
  let panel = document.getElementById("ich-token-statuses");

  if (!panel) {
    panel = document.createElement("div");
    panel.id = "ich-token-statuses";
    panel.hidden = true;
  }

  panel.dataset.placement = "topRight";
  panel.classList.remove("ich-placement-action-bar");
  panel.classList.add("ich-placement-top-right");

  if (panel.parentElement !== overlay) overlay.appendChild(panel);

  return panel;
}

export function positionTokenStatuses() {
  const panel = document.getElementById("ich-token-statuses");
  if (!panel || panel.hidden) return;

  panel.style.removeProperty("left");
  panel.style.removeProperty("bottom");
}

export async function renderTokenStatuses() {
  const panel = ensureTokenStatusContainer();
  if (!panel) return;

  if (!settingOn("enableTokenStatuses") || !desktopHudEnabled()) {
    panel.innerHTML = "";
    panel.hidden = true;
    return;
  }

  const token = getActionBarToken();
  if (!token?.actor) {
    panel.innerHTML = "";
    panel.hidden = true;
    return;
  }

  const statuses = await buildTokenStatusData(token);
  unpinStatusTooltip();
  applyStatusPanelStyles(panel);
  panel.innerHTML = statuses.length
    ? await ichRenderTemplate(`${MODULE_PATH}/src/components/token-statuses/token-statuses.hbs`, { statuses })
    : "";
  panel.hidden = !statuses.length;
  publishTurnTrackerBounds();
  positionTokenStatuses();
}

export function bindTokenStatusInteractions() {
  bindStatusContextMenu();
  bindStatusTooltips();
}
