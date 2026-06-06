import { describe, it, expect } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

describe("github module", () => {
  it("should load module via require", () => {
    const mod = require("../src/index");
    expect(mod).toBeDefined();
  });
});