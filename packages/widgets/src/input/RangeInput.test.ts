import { describe, it, expect, vi, afterEach } from "vitest";
import { Screen, caps, createKeyEvent } from "@termuijs/core";

afterEach(() => {
  vi.restoreAllMocks();
});

const key = (name: string) =>
  createKeyEvent({ key: name, raw: Buffer.alloc(0), ctrl: false, alt: false, shift: false });

describe("RangeInput", () => {
  it("constructs with defaults", async () => {
    const { RangeInput } = await import("./RangeInput.js");
    const range = new RangeInput("Filter");
    expect(range.getValue()).toEqual([0, 100]);
  });

  it("setValue updates value within bounds", async () => {
    const { RangeInput } = await import("./RangeInput.js");
    const range = new RangeInput("Filter", {}, { min: 0, max: 100 });
    
    range.setValue([20, 80]);
    expect(range.getValue()).toEqual([20, 80]);
  });

  it("clamps below min and above max", async () => {
    const { RangeInput } = await import("./RangeInput.js");
    const range = new RangeInput("Filter", {}, { min: 0, max: 100 });

    range.setValue([-10, 150]);
    expect(range.getValue()).toEqual([0, 100]);
  });

  it("prevents crossing bounds", async () => {
    const { RangeInput } = await import("./RangeInput.js");
    const range = new RangeInput("Filter", {}, { min: 0, max: 100 });

    range.setValue([80, 20]);
    // lower gets clamped to upper if it exceeds
    expect(range.getValue()).toEqual([20, 20]);
  });

  it("arrow right increments active thumb", async () => {
    const { RangeInput } = await import("./RangeInput.js");
    const range = new RangeInput("Filter", {}, { step: 5 });

    // Active thumb defaults to 0 (lower bound)
    range.setValue([20, 80]);
    range.handleKey(key("right"));
    expect(range.getValue()).toEqual([25, 80]);
  });

  it("arrow left decrements active thumb", async () => {
    const { RangeInput } = await import("./RangeInput.js");
    const range = new RangeInput("Filter", {}, { step: 5 });

    // Active thumb defaults to 0 (lower bound)
    range.setValue([20, 80]);
    range.handleKey(key("left"));
    expect(range.getValue()).toEqual([15, 80]);
  });

  it("tab switches active thumb", async () => {
    const { RangeInput } = await import("./RangeInput.js");
    const range = new RangeInput("Filter", {}, { step: 5 });

    range.setValue([20, 80]);
    range.handleKey(key("tab")); // Switches to upper bound
    
    range.handleKey(key("right"));
    expect(range.getValue()).toEqual([20, 85]);

    range.handleKey(key("left"));
    expect(range.getValue()).toEqual([20, 80]);
  });

  it("fires onChange callback", async () => {
    const { RangeInput } = await import("./RangeInput.js");
    const onChange = vi.fn();
    const range = new RangeInput("Filter", {}, { step: 5, onChange });

    range.setValue([20, 80]);
    expect(onChange).toHaveBeenCalledWith([20, 80]);

    range.handleKey(key("right"));
    expect(onChange).toHaveBeenCalledWith([25, 80]);
  });

  it("renders ascii mode", async () => {
    vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

    const { RangeInput } = await import("./RangeInput.js");

    const range = new RangeInput("Filter");
    range.setValue([20, 80]);
    range.updateRect({ x: 0, y: 0, width: 40, height: 1 });

    const screen = new Screen(40, 1);
    range.render(screen);

    const rendered = screen.back[0]
      .map((c: { char: string }) => c.char)
      .join("");

    expect(rendered).toContain("#");
    expect(rendered).toContain("-");
    expect(rendered).toContain("O");
  });

  it("renders unicode mode", async () => {
    vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

    const { RangeInput } = await import("./RangeInput.js");

    const range = new RangeInput("Filter");
    range.setValue([20, 80]);
    range.updateRect({ x: 0, y: 0, width: 40, height: 1 });

    const screen = new Screen(40, 1);
    range.render(screen);

    const rendered = screen.back[0]
      .map((c: { char: string }) => c.char)
      .join("");

    expect(rendered).toMatch(/[█░]/);
  });
});
