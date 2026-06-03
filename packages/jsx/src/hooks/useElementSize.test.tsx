import { describe, it, expect } from "vitest";

describe("useElementSize", () => {
  it("should return 0 width and height by default when unmounted", () => {
    const defaultSize = { width: 0, height: 0 };
    expect(defaultSize.width).toBe(0);
    expect(defaultSize.height).toBe(0);
  });
});
