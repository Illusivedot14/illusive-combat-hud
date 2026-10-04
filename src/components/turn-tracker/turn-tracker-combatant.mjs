import { canControlToken, panCanvasToToken, pingCanvasAtToken } from "../../common/token-actions.mjs";
import { getViewedCombat } from "../../common/combat.mjs";

/** Combatant ids a card represents: a single combatant, or every member of a group. */
export function cardMemberIds(combat, card) {
	if (!combat || !card) return [];
	const groupId = card.dataset.groupId;
	if (groupId) {
		const group = combat.groups?.get(groupId);
		return group ? [...group.members].map((member) => member.id) : [];
	}
	const id = card.dataset.combatantId;
	return id ? [id] : [];
}

export function combatantToken(combatant) {
	return combatant?.token?.object ?? canvas.tokens?.get(combatant?.tokenId) ?? null;
}

/**
 * Resolve a context-menu target into { combat, el, combatant, group, members, list }.
 * `list` is the set of combatants the action should act on.
 */
export function resolveCombatant(target) {
	const el = target instanceof HTMLElement ? target : target?.[0] ?? null;
	const combat = getViewedCombat();
	const groupId = el?.dataset?.groupId;

	if (groupId) {
		const group = combat?.groups?.get(groupId) ?? null;
		const members = group ? [...group.members] : [];
		return { combat, el, combatant: null, group, members, list: members };
	}

	const id = el?.dataset?.combatantId;
	const combatant = id ? combat?.combatants.get(id) ?? null : null;
	const list = combatant ? [combatant] : [];
	return { combat, el, combatant, group: null, members: list, list };
}

/**
 * Move the turn pointer to a combatant. Targets earlier in initiative than the
 * current actor advance the round; targets at/after stay in this round.
 */
export function jumpToCombatantTurn(combat, combatant) {
	const turns = combat.turns ?? [];
	const target = turns.findIndex((t) => t.id === combatant.id);
	if (target < 0) return;

	const current = combat.turn ?? 0;
	const nextRound = combat.started && target < current;

	void combat.update(
		nextRound ? { round: (combat.round ?? 1) + 1, turn: target } : { turn: target }
	);
}

/** Pan to a group; select only tokens this user can control. */
export function focusGroupTokens(group) {
	if (!group) return;
	const tokens = [...group.members]
		.map((member) => member.token?.object ?? canvas.tokens?.get(member.tokenId))
		.filter(Boolean);
	if (!tokens.length) return;

	const controllable = tokens.filter((token) => canControlToken(token));
	if (controllable.length) {
		controllable.forEach((token, index) => token.control?.({ releaseOthers: index === 0 }));
		panCanvasToToken(controllable[0]);
		return;
	}

	panCanvasToToken(tokens[0]);
	pingCanvasAtToken(tokens[0]);
}
