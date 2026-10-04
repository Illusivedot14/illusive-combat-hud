import { MODULE_ID, MODULE_PATH, ichRenderTemplate } from "../../common/constants.mjs";
import { buildUnitData } from "../../common/actor-data.mjs";
import { getViewedCombat } from "../../common/combat.mjs";
import { getCarouselLayout } from "./carousel-layout.mjs";
import {
	positionCarousel,
	playTurnSlide,
	positionTurnTracker
} from "./turn-tracker-carousel.mjs";
import {
	applyCarouselLayout,
	needsFullRebuild,
	updateTurnTrackerControls
} from "./turn-tracker-dom.mjs";
import {
	applyTurnTrackerMinimized,
	playTurnTrackerReveal,
	seedTurnTrackerReveal
} from "./turn-tracker-minimize.mjs";

let renderTicket = 0;

/** Compare the stored round:turn key against the combat to derive slide direction. */
export function turnDirection(prevKey, combat) {
	if (!combat?.started || !prevKey) return 0;
	const [prevRound, prevTurn] = prevKey.split(":").map(Number);
	const round = combat.round ?? 0;
	const turn = combat.turn ?? -1;
	if (round !== prevRound) return round > prevRound ? 1 : -1;
	if (turn !== prevTurn) return turn > prevTurn ? 1 : -1;
	return 0;
}

function buildTurnKey(combat) {
	return combat.started ? `${combat.round ?? 0}:${combat.turn ?? -1}` : "";
}

function trackNeedsRebuild(track, combat, layout) {
	return track.dataset.combatId !== combat.id
		|| track.dataset.signature !== layout.signature
		|| needsFullRebuild(track, layout);
}

function hideTracker(root, track) {
	root.classList.add("ich-hidden");
	track.innerHTML = "";
	track.dataset.combatId = "";
	track.dataset.turnKey = "";
	track.dataset.signature = "";
}

function showTracker(root, combat, { prepareReveal = false } = {}) {
	// Minimize chrome first so cards never flash open when the tracker is collapsed.
	applyTurnTrackerMinimized(root);
	// Park off-screen before un-hiding so the first paint is never the open dock.
	if (prepareReveal) seedTurnTrackerReveal(root);
	root.classList.remove("ich-hidden");
	updateTurnTrackerControls(combat);
}

function paintFrame() {
	return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function finishRender(root, { wasHidden, recenter, reposition, direction }) {
	if (wasHidden) {
		// No open-frame paint — stay parked until the reveal transition starts.
		positionTurnTracker();
		if (recenter || reposition) positionCarousel(false);
		await playTurnTrackerReveal(root);
		return;
	}

	await paintFrame();
	positionTurnTracker();
	if (recenter || reposition) positionCarousel(Boolean(recenter));
	playTurnSlide(direction);
}

async function rebuildTrackFromLayout(track, combat, layout) {
	track.innerHTML = await ichRenderTemplate(
		`${MODULE_PATH}/src/components/turn-tracker/turn-tracker.hbs`,
		layout
	);
	track.dataset.combatId = combat.id;
	track.dataset.signature = layout.signature;
	applyCarouselLayout(track, layout);
}

export async function renderTurnTracker(root, { recenter = false, reposition = false } = {}) {
	const ticket = ++renderTicket;
	try {
		const track = document.getElementById("ich-turn-tracker-track");
		if (!track) return;

		const combat = getViewedCombat();
		if (!combat) {
			hideTracker(root, track);
			return;
		}

		const layout = getCarouselLayout(combat, buildUnitData);
		if (ticket !== renderTicket) return;

		if (!layout) {
			hideTracker(root, track);
			return;
		}

		const wasHidden = root.classList.contains("ich-hidden");
		showTracker(root, combat, { prepareReveal: wasHidden });

		const direction = turnDirection(track.dataset.turnKey, combat);
		track.dataset.turnKey = buildTurnKey(combat);

		if (trackNeedsRebuild(track, combat, layout)) {
			await rebuildTrackFromLayout(track, combat, layout);
			if (ticket !== renderTicket) return;
		} else {
			applyCarouselLayout(track, layout);
		}

		await finishRender(root, { wasHidden, recenter, reposition, direction });
	} catch (error) {
		console.error(`${MODULE_ID} | turn-tracker render failed`, error);
	}
}
