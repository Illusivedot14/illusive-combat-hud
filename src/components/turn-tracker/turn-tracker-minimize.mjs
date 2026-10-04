import { MODULE_ID } from "../../common/constants.mjs";
import { ich } from "../../common/i18n.mjs";
import { getUiLocalRect } from "../../common/viewport.mjs";
import { positionTurnTracker } from "./turn-tracker-position.mjs";

const MOTION_MS = 320;
const MOTION_CLASS = "ich-turn-rail-motion";
const MOTION_OUT = "ich-turn-rail-motion-out";
const MOTION_IN = "ich-turn-rail-motion-in";

function motionRoot(root = document.getElementById("ich-turn-tracker")) {
	return root?.querySelector(".ich-turn-motion") ?? null;
}

function prefersReducedMotion() {
	return typeof matchMedia === "function"
		&& matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function animationEnabled() {
	return !prefersReducedMotion();
}

export function isTurnTrackerMinimized() {
	return game.settings.get(MODULE_ID, "turnTrackerMinimized") === true;
}

function updateMinimizeControl(root) {
	const button = root?.querySelector(".ich-turn-minimize");
	if (!button) return;

	const minimized = root.classList.contains("ich-turn-minimized");
	const icon = button.querySelector("i");
	if (icon) icon.className = minimized ? "fas fa-chevron-down" : "fas fa-chevron-up";

	const label = minimized ? ich.turnTracker("expand") : ich.turnTracker("minimize");
	button.setAttribute("aria-label", label);
	button.dataset.tooltip = label;
	button.setAttribute("aria-expanded", minimized ? "false" : "true");
}

function clearMotionStyles(motion) {
	motion.style.removeProperty("height");
	motion.style.removeProperty("min-height");
	motion.style.removeProperty("max-height");
	motion.style.removeProperty("margin-top");
	motion.style.removeProperty("transform");
	motion.style.removeProperty("overflow");
	motion.style.removeProperty("pointer-events");
	motion.style.removeProperty("visibility");
}

function clearMotionClasses(root) {
	root.classList.remove(MOTION_CLASS, MOTION_OUT, MOTION_IN);
}

function beginMotion(root, direction) {
	clearMotionClasses(root);
	root.classList.add(MOTION_CLASS);
	root.classList.add(direction === "out" ? MOTION_OUT : MOTION_IN);
}

function waitForMotion(motion) {
	return new Promise((resolve) => {
		let settled = false;
		const finish = () => {
			if (settled) return;
			settled = true;
			motion.removeEventListener("transitionend", onEnd);
			clearTimeout(timer);
			resolve();
		};
		const onEnd = (event) => {
			if (event.target !== motion) return;
			if (event.propertyName && event.propertyName !== "transform") return;
			finish();
		};
		motion.addEventListener("transitionend", onEnd);
		const timer = setTimeout(finish, MOTION_MS + 120);
	});
}

function lockMotionHeight(motion, height) {
	motion.style.overflow = "visible";
	motion.style.height = `${height}px`;
	motion.style.minHeight = `${height}px`;
	motion.style.maxHeight = `${height}px`;
	motion.style.visibility = "visible";
}

/** Pixels needed to move the motion root fully past the top of the UI viewport. */
function slideOffDistance(motion) {
	const bottom = getUiLocalRect(motion)?.bottom ?? motion.offsetHeight;
	return Math.ceil(Math.max(bottom, motion.offsetHeight)) + 8;
}

function applyMinimizedInstant(root, minimized) {
	clearMotionClasses(root);
	const motion = motionRoot(root);
	if (motion) clearMotionStyles(motion);
	root.classList.toggle("ich-turn-minimized", minimized);
	if (motion) motion.setAttribute("aria-hidden", minimized ? "true" : "false");
}

/**
 * Slide the turn cards fully off the top of the screen (transform) while
 * collapsing only the layout gap for the chevron (margin-top). Height stays locked.
 */
async function animateTurnTrackerMinimized(root, minimized) {
	const motion = motionRoot(root);
	if (!motion || !animationEnabled()) {
		applyMinimizedInstant(root, minimized);
		return;
	}

	root.style.overflow = "visible";

	if (minimized) {
		const height = motion.offsetHeight;
		if (height <= 0) {
			applyMinimizedInstant(root, true);
			return;
		}

		const slidePx = slideOffDistance(motion);
		const extraSlide = Math.max(0, slidePx - height);
		lockMotionHeight(motion, height);
		motion.style.marginTop = "0px";
		motion.style.transform = "translateY(0)";
		// Sync start state in this frame — no painted pause at full size.
		void motion.offsetHeight;

		beginMotion(root, "out");
		motion.style.marginTop = `${-height}px`;
		motion.style.transform = `translateY(${-extraSlide}px)`;
		motion.style.pointerEvents = "none";

		await waitForMotion(motion);

		root.classList.add("ich-turn-minimized");
		clearMotionClasses(root);
		clearMotionStyles(motion);
		root.style.removeProperty("overflow");
		motion.setAttribute("aria-hidden", "true");
		return;
	}

	const storedHeight = Math.ceil(parseFloat(root.style.getPropertyValue("--ich-turn-frame-height")) || 0);
	const controls = [...root.querySelectorAll(".ich-turn-controls")];
	// Seed the collapsed pose before the first paint so the open tracker never flashes.
	root.classList.remove("ich-turn-minimized");
	motion.setAttribute("aria-hidden", "false");
	motion.style.visibility = "hidden";
	motion.style.pointerEvents = "none";
	for (const el of controls) {
		el.style.visibility = "hidden";
		el.style.pointerEvents = "none";
	}

	const height = motion.offsetHeight || storedHeight;
	if (height <= 0) {
		for (const el of controls) {
			el.style.removeProperty("visibility");
			el.style.removeProperty("pointer-events");
		}
		clearMotionStyles(motion);
		applyMinimizedInstant(root, false);
		return;
	}

	lockMotionHeight(motion, height);
	motion.style.marginTop = `${-height}px`;
	motion.style.transform = "translateY(0)";
	void motion.offsetHeight;

	motion.style.transform = `translateY(${-slideOffDistance(motion)}px)`;
	void motion.offsetHeight;

	motion.style.visibility = "visible";
	beginMotion(root, "in");
	motion.style.marginTop = "0px";
	motion.style.transform = "translateY(0)";
	motion.style.pointerEvents = "";

	await waitForMotion(motion);

	for (const el of controls) {
		el.style.removeProperty("visibility");
		el.style.removeProperty("pointer-events");
	}
	clearMotionClasses(root);
	clearMotionStyles(motion);
	root.style.removeProperty("overflow");
}

function syncFrameHeight(root) {
	const motion = motionRoot(root);
	if (!motion || root.classList.contains("ich-turn-minimized")) return;
	const height = motion.offsetHeight;
	if (height > 0) root.style.setProperty("--ich-turn-frame-height", `${height}px`);
}

const REVEAL_CLASS = "ich-turn-reveal-in";
const REVEAL_PREP_CLASS = "ich-turn-reveal-prep";

function waitForDockReveal(dock) {
	return new Promise((resolve) => {
		let settled = false;
		const finish = () => {
			if (settled) return;
			settled = true;
			dock.removeEventListener("transitionend", onEnd);
			clearTimeout(timer);
			resolve();
		};
		const onEnd = (event) => {
			if (event.target !== dock) return;
			if (event.propertyName && event.propertyName !== "transform") return;
			finish();
		};
		dock.addEventListener("transitionend", onEnd);
		const timer = setTimeout(finish, MOTION_MS + 120);
	});
}

function clearRevealStyles(root, dock) {
	root.classList.remove(REVEAL_CLASS, REVEAL_PREP_CLASS);
	dock.style.removeProperty("transform");
	dock.style.removeProperty("opacity");
}

/**
 * Park the dock above the viewport before the tracker is un-hidden so the first
 * painted frame is never the fully open encounter bar.
 * @returns {boolean} true when a reveal animation should run
 */
export function seedTurnTrackerReveal(root = document.getElementById("ich-turn-tracker")) {
	const dock = root?.querySelector(".ich-turn-dock");
	if (!dock || !animationEnabled()) return false;

	dock.style.transform = "translateY(-120vh)";
	dock.style.opacity = "0";
	root.classList.add(REVEAL_PREP_CLASS);
	return true;
}

/**
 * Slide the whole turn tracker dock down into place when an encounter first appears.
 * Gated by the shared HUD slide animation setting.
 */
export async function playTurnTrackerReveal(root = document.getElementById("ich-turn-tracker")) {
	const dock = root?.querySelector(".ich-turn-dock");
	if (!dock) return;
	if (!animationEnabled()) {
		clearRevealStyles(root, dock);
		return;
	}
	if (root.dataset.turnAnimating === "1") return;

	root.dataset.turnAnimating = "1";
	try {
		positionTurnTracker();
		const height = Math.ceil(dock.offsetHeight || getUiLocalRect(dock)?.height || 0);
		const slidePx = Math.max(height, 80) + 28;

		// Stay off-screen for this frame — never paint the open pose first.
		dock.style.transform = `translateY(${-slidePx}px)`;
		dock.style.opacity = "0";
		void dock.offsetHeight;

		root.classList.add(REVEAL_CLASS);
		root.classList.remove(REVEAL_PREP_CLASS);
		dock.style.transform = "translateY(0)";
		dock.style.opacity = "1";
		await waitForDockReveal(dock);
	} finally {
		clearRevealStyles(root, dock);
		delete root.dataset.turnAnimating;
	}
}

/** Sync minimized UI from the client setting (no animation — used on mount/settings). */
export function applyTurnTrackerMinimized(root = document.getElementById("ich-turn-tracker")) {
	if (!root) return;
	if (root.dataset.turnAnimating === "1") return;

	applyMinimizedInstant(root, isTurnTrackerMinimized());
	updateMinimizeControl(root);
	if (!isTurnTrackerMinimized()) syncFrameHeight(root);
	positionTurnTracker();
}

export async function toggleTurnTrackerMinimized(root = document.getElementById("ich-turn-tracker")) {
	if (!root) return;
	if (root.dataset.turnAnimating === "1") return;

	const nextMinimized = !isTurnTrackerMinimized();
	root.dataset.turnAnimating = "1";
	try {
		if (nextMinimized) syncFrameHeight(root);
		await animateTurnTrackerMinimized(root, nextMinimized);
		updateMinimizeControl(root);
		await game.settings.set(MODULE_ID, "turnTrackerMinimized", nextMinimized);
	} finally {
		delete root.dataset.turnAnimating;
		applyTurnTrackerMinimized(root);
	}
}
