// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { installFoundry } from "./helpers.mjs";
import {
  isActionBarContentVisible,
  isActionBarExpanded,
  syncFoundryUiVisibility,
  isFoundryHotbarHidden
} from "../src/components/action-bar/action-bar-foundry-ui.mjs";

function mockHotbarRect(hotbar, { left = 100, width = 400, top = 900, height = 52 } = {}) {
  hotbar.getBoundingClientRect = () => ({
    x: left,
    y: top,
    left,
    right: left + width,
    top,
    bottom: top + height,
    width,
    height,
    toJSON() {
      return this;
    }
  });
}

function mountActionBarDom({ dockHidden = false, barHidden = true } = {}) {
  document.body.innerHTML = `
    <div id="hotbar"></div>
    <div id="players"></div>
    <div id="fps"></div>
    <div id="ich-action-bar-dock"${dockHidden ? " hidden" : ""}>
      <div id="ich-action-bar"${barHidden ? " hidden" : ""}></div>
    </div>
  `;
  mockHotbarRect(document.getElementById("hotbar"));
}

describe("action-bar-foundry-ui", () => {
  beforeEach(() => {
    installFoundry({
      settings: {
        enableActionBar: true,
        actionBarMinimized: false,
        hideHotbarWhenVisible: true
      }
    });
    mountActionBarDom();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("does not hide Foundry UI when the action bar is hidden", () => {
    syncFoundryUiVisibility();
    expect(document.getElementById("hotbar").classList.contains("ich-ui-hidden")).toBe(false);
    expect(isActionBarContentVisible()).toBe(false);
    expect(isActionBarExpanded()).toBe(false);
  });

  it("hides hotbar, players, and fps when the action bar is expanded", () => {
    document.getElementById("ich-action-bar").hidden = false;
    syncFoundryUiVisibility();
    expect(isActionBarContentVisible()).toBe(true);
    expect(isActionBarExpanded()).toBe(true);
    expect(document.getElementById("hotbar").classList.contains("ich-ui-hidden")).toBe(true);
    expect(document.getElementById("players").classList.contains("ich-ui-hidden")).toBe(true);
    expect(document.getElementById("fps").classList.contains("ich-ui-hidden")).toBe(true);
    expect(isFoundryHotbarHidden()).toBe(true);
  });

  it("restores Foundry UI when the action bar closes", () => {
    const bar = document.getElementById("ich-action-bar");
    bar.hidden = false;
    syncFoundryUiVisibility();
    bar.hidden = true;
    syncFoundryUiVisibility();
    expect(document.getElementById("hotbar").classList.contains("ich-ui-hidden")).toBe(false);
  });

  it("shows Foundry hotbar when the action bar is minimized", () => {
    document.getElementById("ich-action-bar").hidden = false;
    globalThis.game.settings._store.set("actionBarMinimized", true);
    syncFoundryUiVisibility();
    expect(isActionBarContentVisible()).toBe(true);
    expect(isActionBarExpanded()).toBe(false);
    expect(document.getElementById("hotbar").classList.contains("ich-ui-hidden")).toBe(false);
    expect(isFoundryHotbarHidden()).toBe(false);
  });

  it("undocks a leftover hotbar from the old well", () => {
    document.getElementById("ich-action-bar").hidden = false;
    const well = document.createElement("div");
    well.id = "ich-hotbar-well";
    document.body.appendChild(well);
    const hotbar = document.getElementById("hotbar");
    well.appendChild(hotbar);
    hotbar.dataset.ichDocked = "true";

    syncFoundryUiVisibility();
    expect(hotbar.parentElement?.id).not.toBe("ich-hotbar-well");
    expect(hotbar.dataset.ichDocked).toBeUndefined();
    expect(hotbar.classList.contains("ich-ui-hidden")).toBe(true);
  });

  it("does not clobber chrome mid-handoff", () => {
    document.getElementById("ich-action-bar").hidden = false;
    const dock = document.getElementById("ich-action-bar-dock");
    const hotbar = document.getElementById("hotbar");
    dock.classList.add("ich-action-bar-dock--handoff");
    hotbar.classList.remove("ich-ui-hidden");
    hotbar.classList.add("ich-ui-handoff", "ich-ui-handoff-visible");

    syncFoundryUiVisibility();
    expect(hotbar.classList.contains("ich-ui-handoff")).toBe(true);
    expect(hotbar.classList.contains("ich-ui-hidden")).toBe(false);
  });

  it("marks the hotbar as band-aligned when visible", () => {
    document.getElementById("ich-action-bar").hidden = false;
    globalThis.game.settings._store.set("actionBarMinimized", true);
    syncFoundryUiVisibility();
    expect(document.getElementById("hotbar").classList.contains("ich-hotbar-band-aligned")).toBe(true);
  });

  it("clears hotbar alignment while the action bar is expanded", () => {
    document.getElementById("ich-action-bar").hidden = false;
    const hotbar = document.getElementById("hotbar");
    hotbar.classList.add("ich-hotbar-band-aligned");
    hotbar.style.left = "40px";
    syncFoundryUiVisibility();
    expect(hotbar.classList.contains("ich-ui-hidden")).toBe(true);
    expect(hotbar.classList.contains("ich-hotbar-band-aligned")).toBe(false);
    expect(hotbar.style.left).toBe("");
  });
});
