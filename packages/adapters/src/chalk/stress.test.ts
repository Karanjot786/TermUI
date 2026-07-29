import { describe, it, expect } from "vitest";
import { ChalkAdapter } from "./index";

const adapter = new ChalkAdapter();

describe("ChalkAdapter -- stress test", () => {
  it("should not corrupt output at 10k rapid writes", () => {
    const outputs: string[] = [];

    for (let i = 0; i < 10_000; i++) {
      const result = adapter.write(`line-${i}`, i % 2 === 0 ? "red" : "blue");
      outputs.push(result);
    }

    // All writes should return a non-empty string
    expect(outputs.every((o) => o.length > 0)).toBe(true);

    // No writes should contain style bleed sequences from adjacent outputs
    for (let i = 1; i < outputs.length; i++) {
      expect(outputs[i]).not.toMatch(/\x1b\[0m\x1b\[3[0-4]m/);
    }
  });

  it("should maintain color state isolation across writes", () => {
    const a = adapter.write("normal", undefined);
    const b = adapter.write("red", "red");
    const c = adapter.write("back to normal", undefined);
    // b should contain red ANSI codes, c should not
    expect(b).not.toBe(c);
    expect(c).not.toContain("\x1b[31m");
  });
});
