/** Per-player visibility for connection QR tiles/drawings (flags.connection-qr). */
const FLAG_SCOPE = "connection-qr";

function targetUserId(doc) {
	return doc?.getFlag?.(FLAG_SCOPE, "userId") ?? null;
}

function applyPlaceableVisibility(placeable) {
	const doc = placeable?.document;
	if (!doc) return;
	const onlyFor = targetUserId(doc);
	if (!onlyFor) return;

	// GMs always see them so they can manage placement.
	if (game.user.isGM) {
		placeable.visible = true;
		return;
	}

	placeable.visible = game.user.id === onlyFor;
}

function refreshConnectionQrs() {
	if (!canvas?.ready) return;
	for (const tile of canvas.tiles?.placeables ?? []) applyPlaceableVisibility(tile);
	for (const drawing of canvas.drawings?.placeables ?? []) applyPlaceableVisibility(drawing);
}

/** Hide connection QR tiles/drawings from everyone except the chosen player (+ GMs). */
export function bindConnectionQrVisibility() {
	Hooks.on("refreshTile", (tile) => applyPlaceableVisibility(tile));
	Hooks.on("refreshDrawing", (drawing) => applyPlaceableVisibility(drawing));
	Hooks.on("canvasReady", () => refreshConnectionQrs());
	Hooks.on("updateTile", () => refreshConnectionQrs());
	Hooks.on("updateDrawing", () => refreshConnectionQrs());
	Hooks.on("createTile", () => queueMicrotask(refreshConnectionQrs));
	Hooks.on("createDrawing", () => queueMicrotask(refreshConnectionQrs));
}
