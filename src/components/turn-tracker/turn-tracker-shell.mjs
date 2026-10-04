/** Static markup for the turn tracker dock (carousel + GM controls). */
export const TURN_TRACKER_SHELL = `
<div class="ich-turn-dock">
	<div class="ich-turn-controls ich-turn-controls-left" data-ich-controls="gm">
		<button type="button" class="ich-turn-btn" data-action="previous-encounter" data-ich-encounter hidden data-tooltip="Previous Encounter" aria-label="Previous Encounter">
			<i class="fas fa-caret-up"></i>
		</button>
		<button type="button" class="ich-turn-btn" data-action="roll-all" data-tooltip="COMBAT.RollAll" aria-label="Roll All">
			<i class="fas fa-users"></i>
		</button>
		<button type="button" class="ich-turn-btn" data-action="roll-npc" data-tooltip="COMBAT.RollNPC" aria-label="Roll NPC">
			<i class="fas fa-users-cog"></i>
		</button>
		<button type="button" class="ich-turn-btn" data-action="reset" data-tooltip="COMBAT.InitiativeReset" aria-label="Reset Initiative">
			<i class="fas fa-undo"></i>
		</button>
		<button type="button" class="ich-turn-btn" data-action="previous-turn" data-tooltip="COMBAT.TurnPrev" aria-label="Previous Turn">
			<i class="fas fa-chevron-left"></i>
		</button>
		<button type="button" class="ich-turn-btn" data-action="previous-round" data-tooltip="COMBAT.RoundPrev" aria-label="Previous Round">
			<i class="fas fa-chevrons-left"></i>
		</button>
	</div>

	<div class="ich-turn-carousel">
		<div class="ich-turn-motion">
			<div id="ich-turn-tracker-track"></div>
			<input type="range" class="ich-turn-scroll-slider" min="0" max="1000" value="0" hidden aria-label="Scroll turn tracker">
		</div>
		<button
			type="button"
			class="ich-turn-btn ich-turn-minimize"
			data-action="toggle-minimize"
			aria-label="Minimize turn tracker"
			data-tooltip="Minimize turn tracker"
		>
			<i class="fas fa-chevron-up" aria-hidden="true"></i>
		</button>
	</div>

	<div class="ich-turn-controls ich-turn-controls-right" data-ich-controls="gm">
		<button type="button" class="ich-turn-btn" data-action="start-combat" data-tooltip="COMBAT.Begin" aria-label="Begin Combat">
			<i class="fas fa-play"></i>
		</button>
		<button type="button" class="ich-turn-btn" data-action="end-combat" data-tooltip="COMBAT.End" aria-label="End Combat">
			<i class="fas fa-ban"></i>
		</button>
		<button type="button" class="ich-turn-btn" data-action="configure" data-tooltip="COMBAT.Settings" aria-label="Combat Settings">
			<i class="fas fa-cog"></i>
		</button>
		<button type="button" class="ich-turn-btn" data-action="add-event" data-tooltip="Add Combat Event" aria-label="Add Combat Event">
			<i class="fas fa-globe"></i>
		</button>
		<button type="button" class="ich-turn-btn" data-action="next-turn" data-tooltip="COMBAT.TurnNext" aria-label="Next Turn">
			<i class="fas fa-chevron-right"></i>
		</button>
		<button type="button" class="ich-turn-btn" data-action="next-round" data-tooltip="COMBAT.RoundNext" aria-label="Next Round">
			<i class="fas fa-chevrons-right"></i>
		</button>
		<button type="button" class="ich-turn-btn" data-action="next-encounter" data-ich-encounter hidden data-tooltip="Next Encounter" aria-label="Next Encounter">
			<i class="fas fa-caret-down"></i>
		</button>
	</div>
</div>
`;
