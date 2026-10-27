/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import {
  applyCameraPadChrome,
  PAD_CONTROL_PX,
  PAD_GRID_PX,
  PAD_HEIGHT_PX,
  PAD_WIDTH_PX
} from "../src/components/camera-pad/camera-pad.mjs";

function makePad() {
  const wrap = document.createElement("div");
  wrap.innerHTML = `
<div id="ich-camera-pad" class="ich-camera-pad">
  <div class="ich-camera-pad-arrows">
    <span class="ich-camera-pad-empty"></span>
    <div role="button" data-camera="up"></div>
    <span class="ich-camera-pad-empty"></span>
    <div role="button" data-camera="left"></div>
    <span class="ich-camera-pad-hub"></span>
    <div role="button" data-camera="right"></div>
    <span class="ich-camera-pad-empty"></span>
    <div role="button" data-camera="down"></div>
    <span class="ich-camera-pad-empty"></span>
  </div>
  <div class="ich-camera-pad-zoom">
    <div role="button" data-camera="zoom-in"></div>
    <div role="button" data-camera="zoom-out"></div>
  </div>
</div>`;
  return wrap.firstElementChild;
}

describe("camera pad layout", () => {
  it("does not use Foundry button or aside elements", () => {
    const root = applyCameraPadChrome(makePad());
    expect(root.tagName).toBe("DIV");
    expect(root.querySelectorAll("button")).toHaveLength(0);
    expect(root.querySelectorAll("[data-camera][role='button']")).toHaveLength(6);
  });

  it("locks the whole pad to a compact pixel size", () => {
    const root = applyCameraPadChrome(makePad());
    expect(root.style.width).toBe(`${PAD_WIDTH_PX}px`);
    expect(root.style.height).toBe(`${PAD_HEIGHT_PX}px`);
    expect(root.style.maxWidth).toBe(`${PAD_WIDTH_PX}px`);
    expect(root.style.maxHeight).toBe(`${PAD_HEIGHT_PX}px`);
    expect(PAD_WIDTH_PX).toBe(224);
    expect(PAD_HEIGHT_PX).toBe(164);
  });

  it("locks every key to a square", () => {
    const root = applyCameraPadChrome(makePad());
    const size = `${PAD_CONTROL_PX}px`;
    for (const el of root.querySelectorAll("[data-camera]")) {
      expect(el.style.width).toBe(size);
      expect(el.style.height).toBe(size);
      expect(el.style.minWidth).toBe(size);
      expect(el.style.maxWidth).toBe(size);
      expect(el.style.background).toBe("rgb(42, 28, 16)");
      expect(el.style.border).toContain("2px");
    }
  });

  it("keeps the arrows in a compact 3x3 plus", () => {
    const root = applyCameraPadChrome(makePad());
    const arrows = root.querySelector(".ich-camera-pad-arrows");
    const track = `${PAD_CONTROL_PX}px ${PAD_CONTROL_PX}px ${PAD_CONTROL_PX}px`;
    expect(arrows.style.display).toBe("grid");
    expect(arrows.style.gridTemplateColumns).toBe(track);
    expect(arrows.style.gridTemplateRows).toBe(track);
    expect(arrows.style.width).toBe(`${PAD_GRID_PX}px`);
    expect(arrows.style.height).toBe(`${PAD_GRID_PX}px`);
  });
});
