/** Static markup for the party portrait rail. */
export const PARTY_STATUS_SHELL = `
<div class="ich-party-body">
	<div id="ich-party-list">
		<div id="ich-party-list-track" class="ich-party-list-track"></div>
	</div>
	<input type="range" class="ich-party-scroll-slider" min="0" max="1000" value="0" hidden aria-label="Scroll party portraits">
</div>
<button
	type="button"
	class="ich-party-minimize"
	data-action="toggle-party-minimize"
	aria-label="Minimize party rail"
	data-tooltip="Minimize party rail"
>
	<i class="fas fa-chevron-left" aria-hidden="true"></i>
</button>
`;
