import { describe, it, expect, vi, afterEach } from "vitest";
import { Screen, caps, createKeyEvent } from "@termuijs/core";

afterEach(() => {
  vi.restoreAllMocks();
});

const key = (name: string) =>
  createKeyEvent({ key: name, raw: Buffer.alloc(0), ctrl: false, alt: false, shift: false });

describe("Knob", () => {
  it("constructs with defaults", async () => {
    const { Knob } = await import("./Knob.js");
    const knob = new Knob();
    expect(knob.value).toBe(0);
  });

  it("handles key bindings to increment and decrement", async () => {
    const { Knob } = await import("./Knob.js");
    const onChange = vi.fn();
    const knob = new Knob("", {}, { min: 0, max: 100, step: 10, onChange });

    knob.handleKey(key("up"));
    expect(knob.value).toBe(10);
    expect(onChange).toHaveBeenCalledWith(10);

    knob.handleKey(key("right"));
    expect(knob.value).toBe(20);

    knob.handleKey(key("down"));
    expect(knob.value).toBe(10);

    knob.handleKey(key("left"));
    expect(knob.value).toBe(0);
  });

  it("clamps to min and max", async () => {
    const { Knob } = await import("./Knob.js");
    const knob = new Knob("", {}, { min: 0, max: 10, step: 8 });

    knob.handleKey(key("up"));
    expect(knob.value).toBe(8);

    knob.handleKey(key("up"));
    expect(knob.value).toBe(10); // Clamped at 10

    knob.handleKey(key("down"));
    knob.handleKey(key("down"));
    expect(knob.value).toBe(0); // Clamped at 0
  });

  it("renders unicode correctly", async () => {
    vi.spyOn(caps, 'unicode', 'get').mockReturnValue(true);

    const { Knob } = await import("./Knob.js");
    const knob = new Knob("", {}, { min: 0, max: 100, showValue: true });
    
    knob.setValue(50);
    
    // Create a 5x5 screen for the knob
    knob.updateRect({ x: 0, y: 0, width: 5, height: 5 });
    const screen = new Screen(5, 5);
    knob.render(screen);

    // Render it out to a string block
    const output = Array.from({ length: 5 }, (_, i) => 
      screen.back[i].map((c: { char: string }) => c.char).join("")
    ).join("\n");

    // The circle must have block characters
    expect(output).toMatch(/█/);
    // The value "50" must be rendered inside the knob
    expect(output).toContain("50");
  });

  it("renders ascii correctly", async () => {
    vi.spyOn(caps, 'unicode', 'get').mockReturnValue(false);

    const { Knob } = await import("./Knob.js");
    const knob = new Knob("", {}, { min: 0, max: 100, showValue: true });
    
    knob.setValue(50);
    
    knob.updateRect({ x: 0, y: 0, width: 5, height: 5 });
    const screen = new Screen(5, 5);
    knob.render(screen);

    const output = Array.from({ length: 5 }, (_, i) => 
      screen.back[i].map((c: { char: string }) => c.char).join("")
    ).join("\n");

    // The circle must use ASCII block characters
    expect(output).toMatch(/#/);
    expect(output).toContain("50");
  });
});
