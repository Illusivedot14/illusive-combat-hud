import { getViewedCombat, getSceneCombats } from "../../common/combat.mjs";
import { openAddEventDialog } from "./add-event.mjs";
import { toggleTurnTrackerMinimized } from "./turn-tracker-minimize.mjs";

async function confirmResetInitiative() {
	return foundry.applications.api.DialogV2.confirm({
		window: { title: "COMBAT.InitiativeReset" },
		content: "<p>Reset initiative for all combatants?</p>",
		rejectClose: false
	});
}

function switchEncounter(combat, direction) {
	const combats = getSceneCombats();
	if (combats.length < 2) return;

	const index = combats.findIndex((entry) => entry.id === combat.id);
	const target = combats[(index + direction + combats.length) % combats.length];
	return target?.activate?.();
}

/** Combatants (and event placeholders) that still need an initiative roll. */
function getUnrolledInitiativeIds(combat) {
	return [...(combat?.combatants ?? [])]
		.filter((combatant) => combatant?.initiative == null)
		.map((combatant) => combatant.id)
		.filter(Boolean);
}

/** Roll any missing initiatives, then begin combat. */
async function startCombatRollingUnrolled(combat, event) {
	const unrolled = getUnrolledInitiativeIds(combat);
	if (unrolled.length) {
		if (typeof combat.rollInitiative === "function") {
			await combat.rollInitiative(unrolled, { event });
		} else {
			await combat.rollAll({ event });
		}
	}
	return combat.startCombat();
}

/**
 * GM toolbar button actions on the turn tracker dock.
 * @param {string} action
 * @param {PointerEvent} event
 */
export async function handleTurnTrackerAction(action, event) {
	if (action === "toggle-minimize") {
		return toggleTurnTrackerMinimized();
	}

	const combat = getViewedCombat();
	if (!combat) return;

	switch (action) {
		case "previous-turn":
			return combat.previousTurn();
		case "next-turn":
			return combat.nextTurn();
		case "previous-round":
			return combat.previousRound();
		case "next-round":
			return combat.nextRound();
		case "end-combat":
			return combat.endCombat();
		case "roll-all":
			return combat.rollAll({ event });
		case "roll-npc":
			return combat.rollNPC({ event });
		case "reset":
			if (await confirmResetInitiative()) return combat.resetAll();
			return;
		case "configure":
			return new foundry.applications.apps.CombatTrackerConfig().render(true);
		case "add-event":
			return openAddEventDialog(combat);
		case "start-combat":
			return startCombatRollingUnrolled(combat, event);
		case "previous-encounter":
			return switchEncounter(combat, -1);
		case "next-encounter":
			return switchEncounter(combat, 1);
		default:
			break;
	}
}
