import { describe, it, expect } from "vitest";
import { installFoundry } from "./helpers.mjs";
import {
  findActorTokenDoc,
  getWalkUsedFeet,
  nextTokenStep,
  sceneGridStep,
  stepActorToken,
  tokenViewFromDoc
} from "../src/common/token-step.mjs";

describe("sceneGridStep", () => {
  it("reads Foundry grid size", () => {
    expect(sceneGridStep({ grid: { size: 100 } })).toEqual({ x: 100, y: 100 });
    expect(sceneGridStep({ grid: { sizeX: 50, sizeY: 75 } })).toEqual({ x: 50, y: 75 });
  });
});

describe("nextTokenStep", () => {
  it("moves one square", () => {
    expect(nextTokenStep({ x: 200, y: 300 }, "right", { x: 100, y: 100 }))
      .toEqual({ x: 300, y: 300 });
    expect(nextTokenStep({ x: 200, y: 300 }, "up", { x: 100, y: 100 }))
      .toEqual({ x: 200, y: 200 });
    expect(nextTokenStep({ x: 200, y: 300 }, "upRight", { x: 100, y: 100 }))
      .toEqual({ x: 300, y: 200 });
    expect(nextTokenStep({ x: 200, y: 300 }, "downLeft", { x: 100, y: 100 }))
      .toEqual({ x: 100, y: 400 });
  });

  it("rejects a bad direction", () => {
    expect(nextTokenStep({ x: 0, y: 0 }, "diagonal", { x: 100, y: 100 })).toBeNull();
  });
});

describe("findActorTokenDoc", () => {
  it("picks the owned token on the viewed scene", () => {
    const token = { id: "t1", actorId: "a1", isOwner: true, actor: { id: "a1" } };
    installFoundry({
      actors: [{ id: "a1", name: "Hero" }],
      scene: { id: "scene1", tokens: { filter: (fn) => [token].filter(fn) } }
    });
    globalThis.game.scenes = {
      current: { tokens: [token] },
      viewed: null,
      get: () => null,
      active: null
    };
    expect(findActorTokenDoc({ id: "a1" })).toBe(token);
  });

  it("ignores a token on a different map", () => {
    const other = { id: "t2", actorId: "a1", isOwner: true, parent: { id: "other" } };
    installFoundry({ actors: [{ id: "a1", name: "Hero" }] });
    globalThis.game.scenes = {
      active: { id: "scene1", tokens: [] },
      current: { id: "scene1", tokens: [] },
      get: () => null
    };
    globalThis.game.actors = {
      get: () => ({ id: "a1", getActiveTokens: () => [other] })
    };
    expect(findActorTokenDoc({ id: "a1", getActiveTokens: () => [other] })).toBeNull();
  });
});

describe("stepActorToken", () => {
  it("falls back to update when move does nothing", async () => {
    const updates = [];
    const token = {
      id: "t1",
      actorId: "a1",
      isOwner: true,
      x: 200,
      y: 300,
      parent: { grid: { size: 100 } },
      async move() { /* noCanvas no-op */ },
      async update(data) { updates.push(data); Object.assign(this, data); }
    };
    installFoundry({ actors: [{ id: "a1", name: "Hero" }] });
    globalThis.canvas.ready = true;
    globalThis.canvas.grid = { size: 100 };
    globalThis.game.scenes = { current: { tokens: [token] }, get: () => null, active: null };
    const result = await stepActorToken({ id: "a1" }, "right");
    expect(result.ok).toBe(true);
    expect(updates).toEqual([{ x: 300, y: 300 }]);
  });
});

describe("getWalkUsedFeet", () => {
  it("is zero when this token has not stepped", () => {
    expect(getWalkUsedFeet({ grid: { distance: 5 } }, "nobody")).toBe(0);
  });
});

describe("tokenViewFromDoc", () => {
  it("wraps a token document for movement helpers", () => {
    const doc = { id: "t1", actor: { id: "a1" } };
    expect(tokenViewFromDoc(doc)).toEqual({
      id: "t1",
      actor: { id: "a1" },
      document: doc,
      isOwner: undefined
    });
  });
});
