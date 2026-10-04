// @vitest-environment node
/**
 * Layout contracts for the turn-tracker dock.
 * These parse the CSS on disk so spacing/clipping regressions fail in CI
 * instead of only showing up in screenshots.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
	CONTROL_GAP,
	CONTROL_GAP_RIGHT,
	TRACK_PADDING,
	TRACK_PADDING_INLINE,
	TRACK_PADDING_BLOCK,
	ACTIVE_CARD_GLOW_CLEARANCE
} from "../src/components/turn-tracker/turn-tracker-carousel.mjs";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const baseCss = readFileSync(
	join(rootDir, "src/components/turn-tracker/turn-tracker-base.css"),
	"utf8"
).replace(/^\uFEFF/, "");

function stripComments(text) {
	return text.replace(/\/\*[\s\S]*?\*\//g, "");
}

function ruleBody(selector) {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const re = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`);
	const match = baseCss.match(re);
	if (!match) throw new Error(`Missing CSS rule: ${selector}`);
	return stripComments(match[1]);
}

function decl(body, prop) {
	const re = new RegExp(`${prop}\\s*:\\s*([^;]+);`);
	const match = body.match(re);
	return match ? match[1].trim() : null;
}

describe("turn-tracker layout contracts", () => {
	it("gives the track horizontal glow room without a sideways negative margin", () => {
		expect(TRACK_PADDING_INLINE).toBeGreaterThanOrEqual(ACTIVE_CARD_GLOW_CLEARANCE);
		expect(TRACK_PADDING).toBe(TRACK_PADDING_INLINE * 2);
		const track = ruleBody("#ich-turn-tracker-track");
		expect(decl(track, "padding")).toBe(`${TRACK_PADDING_BLOCK}px var(--ich-turn-track-pad)`);
		expect(decl(track, "scroll-padding-inline")).toBe("var(--ich-turn-track-pad)");
		// No negative horizontal margin — that pulled the track under the menus.
		expect(decl(track, "margin")).toMatch(/^-?\d+px\s+0$/);
	});

	it("pads the track vertically enough for active scale + outside glow", () => {
		expect(TRACK_PADDING_BLOCK).toBeGreaterThanOrEqual(ACTIVE_CARD_GLOW_CLEARANCE);
		const track = ruleBody("#ich-turn-tracker-track");
		const block = Number(decl(track, "padding").match(/^(\d+)px/)[1]);
		expect(block).toBe(TRACK_PADDING_BLOCK);
	});

	it("equalizes the visible card→menu gap: right menu adds one track-pad", () => {
		// left visible gap  = control-gap + track-pad (active card is inset by the left pad)
		// right visible gap = controls-right margin-left (card clips flush at the edge)
		// so: controls-right margin-left === control-gap + track-pad
		expect(CONTROL_GAP_RIGHT).toBe(CONTROL_GAP + TRACK_PADDING_INLINE);

		const dock = ruleBody("#ich-turn-tracker .ich-turn-dock");
		expect(decl(dock, "gap")).toBe("0");

		const left = ruleBody("#ich-turn-tracker .ich-turn-controls-left");
		const right = ruleBody("#ich-turn-tracker .ich-turn-controls-right");
		expect(decl(left, "margin-right")).toBe("var(--ich-turn-control-gap)");
		expect(decl(right, "margin-left")).toBe(
			"calc(var(--ich-turn-control-gap) + var(--ich-turn-track-pad))"
		);
	});

	it("wires the spacing constants into the CSS custom property defaults", () => {
		const root = ruleBody("#ich-turn-tracker");
		expect(decl(root, "--ich-turn-control-gap")).toBe(`${CONTROL_GAP}px`);
		expect(decl(root, "--ich-turn-track-pad")).toBe(`${TRACK_PADDING_INLINE}px`);
	});

	it("does not clip the carousel box (that chops card tops)", () => {
		const carousel = ruleBody("#ich-turn-tracker .ich-turn-carousel");
		expect(decl(carousel, "overflow")).toBe("visible");
		expect(carousel).not.toMatch(/clip-path\s*:/);
		expect(baseCss).not.toMatch(/\.ich-turn-carousel\s*\{[^}]*clip-path\s*:/);
	});

	it("does not paint a chrome background on the GM menu strips", () => {
		const controls = ruleBody("#ich-turn-tracker .ich-turn-controls");
		expect(decl(controls, "background")).toBeNull();
		expect(decl(controls, "border")).toBeNull();
	});
});
