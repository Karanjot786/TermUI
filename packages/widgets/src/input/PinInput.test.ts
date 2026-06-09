import { describe, it, expect, vi, afterEach } from "vitest";
import { Screen, createKeyEvent } from "@termuijs/core";

afterEach(() => {
  vi.restoreAllMocks();
});

const key = (name: string) =>
  createKeyEvent({ key: name, raw: Buffer.alloc(0), ctrl: false, alt: false, shift: false });

describe("PinInput", () => {
  it("constructs with defaults", async () => {
    const { PinInput } = await import("./PinInput.js");
    const pin = new PinInput();
    expect(pin.value).toBe("");
  });

  it("handles character input and auto-advances", async () => {
    const { PinInput } = await import("./PinInput.js");
    const onChange = vi.fn();
    const pin = new PinInput({}, { onChange });

    pin.handleKey(key("1"));
    expect(pin.value).toBe("1");
    expect(onChange).toHaveBeenCalledWith("1");

    pin.handleKey(key("2"));
    expect(pin.value).toBe("12");
    expect(onChange).toHaveBeenCalledWith("12");
  });

  it("fires onComplete when length is reached", async () => {
    const { PinInput } = await import("./PinInput.js");
    const onComplete = vi.fn();
    const pin = new PinInput({}, { length: 3, onComplete });

    pin.handleKey(key("1"));
    pin.handleKey(key("2"));
    pin.handleKey(key("3"));
    
    expect(pin.value).toBe("123");
    expect(onComplete).toHaveBeenCalledWith("123");
  });

  it("handles backspace properly", async () => {
    const { PinInput } = await import("./PinInput.js");
    const pin = new PinInput();

    pin.handleKey(key("1"));
    pin.handleKey(key("2"));
    
    // Deletes '2' and moves cursor back
    pin.handleKey(key("backspace"));
    expect(pin.value).toBe("1");

    // Deletes '1'
    pin.handleKey(key("backspace"));
    expect(pin.value).toBe("");
    
    // Nothing to delete, shouldn't crash
    pin.handleKey(key("backspace"));
    expect(pin.value).toBe("");
  });

  it("handles arrow keys safely", async () => {
    const { PinInput } = await import("./PinInput.js");
    const pin = new PinInput();

    pin.handleKey(key("right"));
    pin.handleKey(key("right"));
    pin.handleKey(key("1"));
    // Should type at pos 2
    expect(pin.value).toBe("1"); 
    
    pin.handleKey(key("left"));
    pin.handleKey(key("left"));
    pin.handleKey(key("left")); // Should clamp to 0
    pin.handleKey(key("2"));
    expect(pin.value).toBe("21"); 
  });

  it("renders correctly", async () => {
    const { PinInput } = await import("./PinInput.js");
    const pin = new PinInput();
    
    pin.handleKey(key("1"));
    pin.handleKey(key("2"));
    
    pin.updateRect({ x: 0, y: 0, width: 40, height: 1 });
    const screen = new Screen(40, 1);
    pin.render(screen);

    const rendered = Array.from({ length: 40 }, (_, i) => screen.getCell(i, 0)?.char ?? " ").join("");

    expect(rendered).toContain("[ 1 ]");
    expect(rendered).toContain("[ 2 ]");
    expect(rendered).toContain("[   ]");
  });

  it("renders masked characters", async () => {
    const { PinInput } = await import("./PinInput.js");
    const pin = new PinInput({}, { masked: true });
    
    pin.handleKey(key("1"));
    pin.handleKey(key("2"));
    
    pin.updateRect({ x: 0, y: 0, width: 40, height: 1 });
    const screen = new Screen(40, 1);
    pin.render(screen);

    const rendered = Array.from({ length: 40 }, (_, i) => screen.getCell(i, 0)?.char ?? " ").join("");

    expect(rendered).toContain("[ • ]");
    expect(rendered).not.toContain("[ 1 ]");
  });
});
