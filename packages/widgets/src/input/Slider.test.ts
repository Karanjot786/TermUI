import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Slider", () => {
  it("constructs with defaults", async () => {
    const { Slider } = await import("./Slider.js");

    const slider = new Slider("Volume");

    expect(slider.getValue()).toBe(0);
  });

  it("setValue updates value", async () => {
    const { Slider } = await import("./Slider.js");

    const slider = new Slider("Volume");

    slider.setValue(50);

    expect(slider.getValue()).toBe(50);
  });

  it("clamps below min and above max", async () => {
    const { Slider } = await import("./Slider.js");

    const slider = new Slider("Volume");

    slider.setValue(-10);
    expect(slider.getValue()).toBe(0);

    slider.setValue(150);
    expect(slider.getValue()).toBe(100);
  });

  it("arrow right increments by step", async () => {
    const { Slider } = await import("./Slider.js");

    const slider = new Slider("Volume", {}, { step: 5 });

    slider.handleKey({ key: "right" } as any);

    expect(slider.getValue()).toBe(5);
  });

  it("arrow left decrements by step", async () => {
    const { Slider } = await import("./Slider.js");

    const slider = new Slider("Volume", {}, { step: 5 });

    slider.setValue(10);

    slider.handleKey({ key: "left" } as any);

    expect(slider.getValue()).toBe(5);
  });

  it("renders ascii mode", async () => {
    vi.stubEnv("NO_UNICODE", "1");
    vi.stubEnv("TERM", "");
    vi.resetModules();

    const { Screen } = await import("@termuijs/core");
    const { Slider } = await import("./Slider.js");

    const slider = new Slider("Volume");

    slider.setValue(50);
    slider.updateRect({
      x: 0,
      y: 0,
      width: 30,
      height: 1,
    });

    const screen = new Screen(30, 1);

    slider.render(screen);

    const rendered = screen.back[0]
      .map((c: { char: string }) => c.char)
      .join("");

    expect(rendered).toContain("#");
    expect(rendered).toContain("-");
  });

  it("renders unicode mode", async () => {
    vi.stubEnv("NO_UNICODE", "");
    vi.stubEnv("TERM", "");
    vi.resetModules();

    const { Screen } = await import("@termuijs/core");
    const { Slider } = await import("./Slider.js");

    const slider = new Slider("Volume");

    slider.setValue(50);
    slider.updateRect({
      x: 0,
      y: 0,
      width: 30,
      height: 1,
    });

    const screen = new Screen(30, 1);

    slider.render(screen);

    const rendered = screen.back[0]
      .map((c: { char: string }) => c.char)
      .join("");

    expect(rendered).toMatch(/[█░]/);
  });
});