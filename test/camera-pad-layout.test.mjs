/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import {
  applyCameraPadChrome,
  cameraPadPlacement,
  PAD_CLEARANCE_PX,
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
  <div class="ich-camera-pad-tools">
    <div role="button" data-camera="zoom-in"></div>
    <div role="button" data-camera="recenter"></div>
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
    expect(root.querySelectorAll("[data-camera][role='button']")).toHaveLength(7);
  });

  it("locks a compact plus with zoom and recenter under it", () => {
    const root = applyCameraPadChrome(makePad());
    expect(root.style.width).toBe(`${PAD_WIDTH_PX}px`);
    expect(root.style.height).toBe(`${PAD_HEIGHT_PX}px`);
    expect(root.style.flexDirection).toBe("column");
    expect(root.style.background).toBe("transparent");
    expect(PAD_WIDTH_PX).toBe(PAD_GRID_PX);
    expect(PAD_WIDTH_PX).toBe(152);
    expect(PAD_HEIGHT_PX).toBe(204);
  });

  it("locks every key to a circle", () => {
    const root = applyCameraPadChrome(makePad());
    const size = `${PAD_CONTROL_PX}px`;
    for (const el of root.querySelectorAll("[data-camera]")) {
      expect(el.style.width).toBe(size);
      expect(el.style.height).toBe(size);
      expect(el.style.borderRadius).toBe("999px");
    }
  });

  it("sits on the right of the HUD band", () => {
    const spot = cameraPadPlacement({
      viewportHeight: 1080,
      bandEnd: 1000
    });
    expect(spot.left).toBe(1000 - PAD_WIDTH_PX - PAD_CLEARANCE_PX);
    expect(spot.bottom).toBe(16);
  });

  it("sits above the action bar when they share a column", () => {
    const actionBar = { left: 200, right: 980, top: 820, bottom: 1060, width: 780, height: 240 };
    const spot = cameraPadPlacement({
      viewportHeight: 1080,
      bandEnd: 1000,
      actionBar
    });
    expect(spot.bottom).toBe(1080 - 820 + PAD_CLEARANCE_PX);
  });

  it("stays under the turn tracker on a tall screen", () => {
    const turnTracker = { left: 0, right: 1080, top: 8, bottom: 120, width: 1080, height: 112 };
    const spot = cameraPadPlacement({
      viewportHeight: 1920,
      bandEnd: 1060,
      turnTracker
    });
    expect(spot.bottom).toBeLessThanOrEqual(1920 - PAD_HEIGHT_PX - (120 + PAD_CLEARANCE_PX));
    expect(spot.left).toBe(1060 - PAD_WIDTH_PX - PAD_CLEARANCE_PX);
  });

  it("keeps the arrows in a compact 3x3 plus", () => {
    const root = applyCameraPadChrome(makePad());
    const arrows = root.querySelector(".ich-camera-pad-arrows");
    const track = `${PAD_CONTROL_PX}px ${PAD_CONTROL_PX}px ${PAD_CONTROL_PX}px`;
    expect(arrows.style.display).toBe("grid");
    expect(arrows.style.gridTemplateColumns).toBe(track);
    expect(arrows.style.gridTemplateRows).toBe(track);
    expect(arrows.style.width).toBe(`${PAD_GRID_PX}px`);
  });
});
