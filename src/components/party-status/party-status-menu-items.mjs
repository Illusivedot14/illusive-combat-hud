import { selectToken, panCanvasToToken } from "../../common/token-actions.mjs";
import { ich } from "../../common/i18n.mjs";
import { getViewedCombat } from "../../common/combat.mjs";
import { jumpToPartyTokenTurn } from "./party-status-combatant.mjs";
import { openPartyPlayerPrefsForm } from "./party-player-prefs-form.mjs";
const isGM = () => game.user?.isGM === true;

async function setDefeated(combatant, isDefeated) {
	await combatant.update({ defeated: isDefeated });
	const statusId = CONFIG.specialStatusEffects?.DEFEATED ?? "dead";
	await combatant.actor?.toggleStatusEffect?.(statusId, { active: isDefeated, overlay: true });
}

function pingToken(token) {
	if (!token) return;
	const center = token.center ?? { x: token.x, y: token.y };
	canvas.ping?.(center);
	panCanvasToToken(token);
}

/** Context-menu entries for a party portrait card. */
export function getPartyMenuItems(token) {
	const actor = token?.actor;
	const items = [
		{
			name: ich.partyMenu("select"),
			icon: '<i class="fas fa-hand-pointer"></i>',
			callback: () => selectToken(token)
		},
		{
			name: ich.partyMenu("ping"),
			icon: '<i class="fas fa-bullseye"></i>',
			callback: () => pingToken(token)
		}
	];

	if (actor?.sheet && (actor.isOwner || game.user.isGM)) {
		items.push({
			name: ich.partyMenu("sheet"),
			icon: '<i class="fas fa-scroll"></i>',
			callback: () => actor.sheet.render(true)
		});
	}

	if (token.isOwner || game.user.isGM) {
		items.push({
			name: ich.partyMenu("target"),
			icon: '<i class="fas fa-crosshairs"></i>',
			callback: () => token.setTarget(true, { releaseOthers: true })
		});
	}

	const combat = getViewedCombat();
	const combatant = combat?.combatants?.find((entry) => entry.tokenId === token?.id) ?? null;

	if (isGM() && combat?.started && combatant) {
		items.push({
			name: ich.partyMenu("setTurn"),
			icon: '<i class="fas fa-flag"></i>',
			callback: () => jumpToPartyTokenTurn({ dataset: { tokenId: token.id } })
		});
	}

	if (isGM() && combatant && !(combatant.isDefeated ?? combatant.defeated)) {
		items.push({
			name: ich.partyMenu("markDefeated"),
			icon: '<i class="fas fa-skull"></i>',
			callback: () => void setDefeated(combatant, true)
		});
	}

	if (isGM() && combatant && (combatant.isDefeated ?? combatant.defeated)) {
		items.push({
			name: ich.partyMenu("unmarkDefeated"),
			icon: '<i class="fas fa-heart-pulse"></i>',
			callback: () => void setDefeated(combatant, false)
		});
	}

	return items;
}

/** Context-menu entries for the party rail background (player layout). */
export function getPartyRailMenuItems() {
	return [
		{
			name: ich.partyMenu("customizeRail"),
			icon: '<i class="fas fa-arrows-up-down-left-right"></i>',
			callback: () => openPartyPlayerPrefsForm("rail")
		}
	];
}
