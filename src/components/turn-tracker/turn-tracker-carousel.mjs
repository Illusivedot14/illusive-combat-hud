/** Re-exports for tests and callers that import from turn-tracker-carousel.mjs. */
export {
	getMaxCards,
	measureControlExtents,
	sizeCarouselWindow,
	computeTurnTrackerScale,
	ACTIVE_CARD_GLOW_CLEARANCE,
	CONTROL_GAP,
	CONTROL_GAP_RIGHT,
	TRACK_PADDING,
	TRACK_PADDING_INLINE,
	TRACK_PADDING_BLOCK
} from "./turn-tracker-window.mjs";
export {
	scrollFromSlider,
	sliderFromScroll,
	updateCarouselScrollSlider,
	bindCarouselScroll
} from "./turn-tracker-scroll.mjs";
export {
	getDockVisualRect,
	positionTurnTracker,
	alignTurnTrackerToBand
} from "./turn-tracker-position.mjs";
export { playTurnSlide, positionCarousel } from "./turn-tracker-motion.mjs";
