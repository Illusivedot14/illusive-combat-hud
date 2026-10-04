import { settingOn } from "../../common/hud-settings.mjs";
import { desktopHudEnabled } from "../../common/mobile-client.mjs";
import { definePanel } from "../../common/render/define-panel.mjs";
import { TURN_TRACKER_SHELL } from "./turn-tracker-shell.mjs";
import { renderTurnTracker } from "./turn-tracker-render.mjs";
import { positionTurnTracker, bindCarouselScroll } from "./turn-tracker-carousel.mjs";
import { onTurnTrackerClick, bindTurnTrackerMenu } from "./turn-tracker-menu.mjs";
import { applyTurnTrackerMinimized } from "./turn-tracker-minimize.mjs";

export { turnDirection } from "./turn-tracker-render.mjs";

export const turnTrackerPanel = definePanel({
	id: "ich-turn-tracker",
	mask: "turn",
	shell: `<div id="ich-turn-tracker" class="ich-hidden">${TURN_TRACKER_SHELL}</div>`,
	enabled: () => settingOn("enableTurnTracker") && desktopHudEnabled(),
	onMount: (root) => {
		root.addEventListener("click", onTurnTrackerClick);
		bindTurnTrackerMenu(root);
		bindCarouselScroll(root);
		applyTurnTrackerMinimized(root);
	},
	position: positionTurnTracker,
	render: renderTurnTracker
});
