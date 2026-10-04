import { updateCardElement } from "./turn-tracker-card-dom.mjs";
import { getSceneCombats } from "../../common/combat.mjs";

function setCombatButtonVisibility(root, combat) {
	const startButton = root.querySelector('[data-action="start-combat"]');
	const endButton = root.querySelector('[data-action="end-combat"]');
	if (startButton) startButton.hidden = combat.started;
	if (endButton) endButton.hidden = !combat.started;
}

function setEncounterButtonVisibility(root) {
	const multipleEncounters = getSceneCombats().length > 1;
	root.querySelectorAll("[data-ich-encounter]").forEach((button) => {
		button.hidden = !multipleEncounters;
	});
}

function setGmControlVisibility(root) {
	root.querySelectorAll('[data-ich-controls="gm"]').forEach((group) => {
		group.hidden = !game.user.isGM;
	});
}

/** Show/hide GM controls and the start/end-combat buttons based on combat state. */
export function updateTurnTrackerControls(combat) {
	const root = document.getElementById("ich-turn-tracker");
	if (!root || !combat) return;

	setCombatButtonVisibility(root, combat);
	setEncounterButtonVisibility(root);
	setGmControlVisibility(root);
}

/** True when the set/order of visible cards no longer matches the layout (needs re-template). */
export function needsFullRebuild(track, layout) {
	const visibleCards = [...track.querySelectorAll(".ich-turn-card[data-combatant-id]")]
		.filter((card) => !card.hidden);
	if (visibleCards.length !== layout.combatantIds.length) return true;

	return visibleCards.some((card, index) => card.dataset.combatantId !== layout.combatantIds[index]);
}

function updateRoundSeparator(track, layout) {
	const separator = track.querySelector(".ich-turn-separator");
	if (!separator) return;

	separator.style.order = layout.separatorOrder;
	const round = separator.querySelector(".ich-turn-separator-round span:last-child");
	if (round) round.textContent = String(layout.round);
}

/** Patch existing cards + the round separator in place (no re-template). */
export function applyCarouselLayout(track, layout) {
	updateRoundSeparator(track, layout);

	for (const data of layout.combatants) {
		const card = track.querySelector(`[data-combatant-id="${data.id}"]`);
		if (card) updateCardElement(card, data);
	}
}
